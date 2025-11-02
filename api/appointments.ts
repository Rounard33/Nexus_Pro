import {createClient, SupabaseClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {rateLimitMiddleware} from './utils/rate-limiter.js';
import {setCORSHeaders} from './utils/security-helpers.js';
import {sanitizeAppointment, validateAppointment, validateAppointmentQuery} from './utils/validation.js';

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

// Domaines autorisés pour CORS
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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Angular nécessite unsafe-inline et unsafe-eval en dev
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
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string;
  
  // ⚠️ IMPORTANT : Définir les headers CORS EN PREMIER, avant toute vérification
  setCORSHeaders(res, origin, 'GET, POST, PATCH, OPTIONS', 'Content-Type, Authorization');
  
  // Gérer les requêtes OPTIONS (preflight) immédiatement
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Vérifier et créer le client Supabase dans le handler
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[APPOINTMENTS] Missing env vars:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      nodeEnv: process.env['NODE_ENV']
    });
    // Les headers CORS sont déjà définis, donc l'erreur sera visible
    return res.status(500).json({ 
      error: 'Configuration serveur incomplète',
      message: 'Variables d\'environnement Supabase manquantes'
    });
  }

  // Créer le client maintenant que nous savons que les variables existent
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  
  // Rate limiting : limites différentes selon la méthode
  let maxRequests = 100; // Par défaut : 100 req/min
  if (req.method === 'POST') {
    maxRequests = 20; // 20 créations de rendez-vous/min
  } else if (req.method === 'PATCH') {
    maxRequests = 30; // 30 mises à jour/min
  }
  
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

  // GET : Récupérer les rendez-vous
  if (req.method === 'GET') {
    try {
      const { status, startDate, endDate } = req.query;

      // Valider les paramètres de requête
      const queryValidation = validateAppointmentQuery({ status, startDate, endDate });
      if (!queryValidation.valid) {
        return res.status(400).json({ error: 'Paramètres invalides', details: queryValidation.errors });
      }

      let query = supabaseAdmin.from('appointments').select(`
        *,
        prestations (
          name
        )
      `);

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
        query = query.gte('appointment_date', startDate)
                     .lte('appointment_date', endDate);
      }

      query = query.order('appointment_date', { ascending: true })
                   .order('appointment_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('[APPOINTMENTS] Supabase error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des rendez-vous',
          details: error.message,
          code: error.code
        });
      }

      // Ne pas logger les données sensibles en production
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      if (isDevelopment && data && data.length > 0) {
        console.log('Sample appointment with prestation:', JSON.stringify(data[0], null, 2));
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('Server error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  // POST : Créer un rendez-vous
  if (req.method === 'POST') {
    try {
      // Valider les données d'entrée
      const validation = validateAppointment(req.body);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Données invalides',
          details: validation.errors
        });
      }

      // Nettoyer et normaliser les données
      const sanitizedData = sanitizeAppointment(req.body);

      // Vérifier qu'il n'y a pas déjà un RDV à cette date/heure
      const { appointment_date, appointment_time } = sanitizedData;
      
      const { data: existingAppointments, error: checkError } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('appointment_date', appointment_date)
        .eq('appointment_time', appointment_time)
        .in('status', ['pending', 'accepted']);

      if (checkError) {
        console.error('[APPOINTMENTS] Check error:', checkError);
        return res.status(500).json({ 
          error: 'Erreur lors de la vérification des créneaux',
          details: checkError.message,
          code: checkError.code
        });
      }

      if (existingAppointments && existingAppointments.length > 0) {
        return res.status(409).json({ error: 'Ce créneau est déjà réservé' });
      }

      // Insérer uniquement les champs autorisés et validés
      const { data, error } = await supabaseAdmin
        .from('appointments')
        .insert([sanitizedData])
        .select(`
          *,
          prestations (
            name
          )
        `)
        .single();

      if (error) {
        console.error('[APPOINTMENTS] Supabase create error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la création du rendez-vous',
          details: error.message,
          code: error.code
        });
      }

      // TODO: Envoyer un email de notification (avec Brevo)
      
      return res.status(201).json(data);
    } catch (error: any) {
      console.error('[APPOINTMENTS] Handler create error:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  // PATCH : Mettre à jour un rendez-vous (accepter/refuser) - PROTÉGÉ
  if (req.method === 'PATCH') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing appointment ID' });
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
      const updateData: any = {
        status: req.body.status?.toLowerCase()?.trim()
      };
      
      if (req.body.notes !== undefined && req.body.notes !== null) {
        updateData.notes = req.body.notes;
      }

      // Vérifier que le statut est valide
      const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
      if (!updateData.status || !validStatuses.includes(updateData.status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      const isDevelopment = process.env['NODE_ENV'] === 'development';
      if (isDevelopment) {
        console.log('Updating appointment:', id, 'with data:', updateData);
      }

      const { data, error } = await supabaseAdmin
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          prestations (
            name
          )
        `)
        .single();

      if (error) {
        console.error('[APPOINTMENTS] Supabase update error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la mise à jour',
          details: error.message,
          code: error.code
        });
      }

      // TODO: Envoyer un email au client (avec Brevo)
      
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[APPOINTMENTS] Handler update error:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}