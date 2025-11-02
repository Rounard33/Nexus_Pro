import {createClient, SupabaseClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {rateLimitMiddleware} from './utils/rate-limiter';

// Fonction pour vérifier l'authentification et les droits admin
async function verifyAuth(req: VercelRequest, supabaseAdmin: SupabaseClient): Promise<{authenticated: boolean; isAdmin?: boolean; user?: any; error?: string}> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {authenticated: false, error: 'Missing or invalid authorization header'};
  }

  const token = authHeader.substring(7); // Enlever "Bearer "

  try {
    // Utiliser le client admin pour vérifier le token
    const {data: {user}, error} = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return {authenticated: false, error: 'Invalid token'};
    }

    // Vérifier si l'utilisateur est admin
    try {
      const { data: adminUser, error: adminError } = await supabaseAdmin
        .from('admin')
        .select('id')
        .eq('id', user.id)
        .single();

      // Si l'utilisateur est dans la table admin, il est admin
      if (adminUser && !adminError) {
        return {
          authenticated: true,
          isAdmin: true,
          user
        };
      }

      // Si la table admin n'existe pas (erreur de table), considérer l'utilisateur comme admin
      if (adminError && adminError.message?.includes('does not exist')) {
        console.warn('⚠️ Table admin n\'existe pas, utilisateur authentifié considéré comme admin');
        return {authenticated: true, isAdmin: true, user};
      }

      // Si l'utilisateur n'est pas dans la table (PGRST116 = no rows returned)
      if (adminError && adminError.code === 'PGRST116') {
        // Vérifier si la table admin est vide (aucun admin existant)
        const { count, error: countError } = await supabaseAdmin
          .from('admin')
          .select('*', { count: 'exact', head: true });

        // Si la table est vide ou inaccessible, créer automatiquement cet utilisateur comme admin
        if (countError || count === 0 || count === null) {
          try {
            // Insérer l'utilisateur dans la table admin
            const { error: insertError } = await supabaseAdmin
              .from('admin')
              .insert([{ id: user.id, email: user.email || '' }]);

            if (!insertError) {
              console.log(`✅ Utilisateur ${user.email} ajouté automatiquement comme admin (premier utilisateur)`);
              return {authenticated: true, isAdmin: true, user};
            } else {
              console.warn('⚠️ Impossible d\'ajouter l\'utilisateur comme admin:', insertError.message);
            }
          } catch (insertErr: any) {
            console.warn('⚠️ Erreur lors de l\'ajout automatique comme admin:', insertErr.message);
            // Si l'insertion échoue mais que la table est vide, autoriser quand même (fallback)
            if (count === 0) {
              console.warn('⚠️ Table admin vide, autorisation de l\'utilisateur (fallback)');
              return {authenticated: true, isAdmin: true, user};
            }
          }
        }
      }

      // Si l'utilisateur n'est pas admin et la table contient d'autres admins, refuser l'accès
      return {
        authenticated: true,
        isAdmin: false,
        user,
        error: 'User is not an admin. Please contact an administrator to grant you access.'
      };
    } catch (adminCheckError: any) {
      // Erreur lors de la vérification admin
      console.error('Erreur lors de la vérification admin:', adminCheckError);
      
      // Si c'est une erreur de table inexistante, autoriser l'utilisateur
      if (adminCheckError.message?.includes('does not exist')) {
        console.warn('⚠️ Table admin inaccessible, utilisateur authentifié considéré comme admin (fallback)');
        return {authenticated: true, isAdmin: true, user};
      }
      
      // Sinon, refuser l'accès par sécurité
      return {authenticated: true, isAdmin: false, user, error: 'Unable to verify admin status'};
    }
  } catch (error: any) {
    return {authenticated: false, error: error.message || 'Authentication failed'};
  }
}

// Domaines autorisés pour CORS (identique à appointments.ts)
function getAllowedOrigins(): string[] {
  const origins = process.env['ALLOWED_ORIGINS']?.split(',') || [];
  const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];
  
  if (isDevelopment) {
    return [...origins, 'http://localhost:4200', 'http://localhost:3000'];
  }
  
  return origins.filter(origin => origin.trim().length > 0);
}

function setSecurityHeaders(res: VercelResponse, origin?: string): void {
  // Headers de sécurité de base
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // CORS sécurisé
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = origin || '';
  
  if (allowedOrigins.includes(requestOrigin) || process.env['NODE_ENV'] === 'development') {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Vérifier et créer le client Supabase dans le handler
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[OPENING-HOURS] Missing env vars:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      nodeEnv: process.env['NODE_ENV']
    });
    return res.status(500).json({ 
      error: 'Configuration serveur incomplète',
      message: 'Variables d\'environnement Supabase manquantes'
    });
  }

  // Créer le client maintenant que nous savons que les variables existent
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  
  const origin = req.headers.origin as string;
  
  // Rate limiting
  const maxRequests = req.method === 'PATCH' ? 30 : 100; // 30 updates/min, 100 reads/min
  const rateLimit = rateLimitMiddleware(req, maxRequests, 60000);
  
  // Ajouter les headers de rate limiting
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Vérifier si la requête est autorisée
  if (!rateLimit.allowed) {
    const resetTimeStr = rateLimit.headers['X-RateLimit-Reset'];
    const resetTime = new Date(resetTimeStr).getTime();
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', Math.max(1, retryAfter).toString());
    return res.status(429).json({
      error: 'Trop de requêtes',
      message: `Limite de ${maxRequests} requêtes par minute dépassée`,
      retryAfter: Math.max(1, retryAfter)
    });
  }
  
  setSecurityHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('opening_hours')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[OPENING-HOURS] Supabase error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des horaires',
          details: error.message,
          code: error.code
        });
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[OPENING-HOURS] Handler error:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  // PATCH : Mettre à jour les horaires - PROTÉGÉ
  if (req.method === 'PATCH') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing opening hours ID' });
    }

    // Valider que l'ID est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof id !== 'string' || !uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid opening hours ID format' });
    }

    // Vérifier l'authentification et les droits admin
    const auth = await verifyAuth(req, supabaseAdmin);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!auth.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    try {
      // Nettoyer le body pour ne garder que les champs autorisés
      const allowedFields = ['day_of_week', 'day_name', 'periods', 'last_appointment', 'is_active', 'display_order'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // Validation basique
      if (updateData.day_of_week !== undefined && (updateData.day_of_week < 0 || updateData.day_of_week > 6)) {
        return res.status(400).json({ error: 'day_of_week must be between 0 and 6' });
      }

      const { data, error } = await supabaseAdmin
        .from('opening_hours')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('[OPENING-HOURS] Supabase update error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la mise à jour des horaires',
          details: error.message,
          code: error.code
        });
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[OPENING-HOURS] Handler update error:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}