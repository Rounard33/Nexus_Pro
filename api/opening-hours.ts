import {createClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';

const supabaseAdmin = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

// Fonction pour vérifier l'authentification et les droits admin
async function verifyAuth(req: VercelRequest): Promise<{authenticated: boolean; isAdmin?: boolean; user?: any; error?: string}> {
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

      // Si la table admin n'existe pas, considérer l'utilisateur authentifié comme admin (fallback)
      if (adminError && (adminError.code === 'PGRST116' || adminError.message?.includes('does not exist'))) {
        console.warn('⚠️ Table admin n\'existe pas, utilisateur authentifié considéré comme admin');
        return {authenticated: true, isAdmin: true, user};
      }

      const isAdmin = !!adminUser && !adminError;

      return {
        authenticated: true,
        isAdmin,
        user,
        ...(!isAdmin && { error: 'User is not an admin' })
      };
    } catch (adminCheckError: any) {
      // Erreur lors de la vérification admin - refuser l'accès par sécurité
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
  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
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
  const origin = req.headers.origin as string;
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
        console.error('Supabase error:', error);
        const isDevelopment = process.env['NODE_ENV'] === 'development';
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des horaires',
          ...(isDevelopment && { details: error.message })
        });
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('Server error:', error);
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        ...(isDevelopment && { details: error.message })
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
    const auth = await verifyAuth(req);
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
        console.error('Supabase error:', error);
        const isDevelopment = process.env['NODE_ENV'] === 'development';
        return res.status(500).json({ 
          error: 'Erreur lors de la mise à jour des horaires',
          ...(isDevelopment && { details: error.message })
        });
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('Server error:', error);
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        ...(isDevelopment && { details: error.message })
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}