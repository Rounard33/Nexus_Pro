import {createClient, SupabaseClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {rateLimitMiddleware} from '../api/utils/rate-limiter.js';
import {setCORSHeaders, setSecurityHeaders} from '../api/utils/security-helpers.js';

// Fonction pour vérifier l'authentification et les droits admin
async function verifyAuth(req: VercelRequest, supabaseAdmin: SupabaseClient): Promise<{authenticated: boolean; isAdmin?: boolean; user?: any; error?: string}> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {authenticated: false, error: 'Missing or invalid authorization header'};
  }

  const token = authHeader.substring(7);

  try {
    const {data: {user}, error} = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return {authenticated: false, error: 'Invalid token'};
    }

    try {
      const { data: adminUser, error: adminError } = await supabaseAdmin
        .from('admin')
        .select('id')
        .eq('id', user.id)
        .single();

      if (adminUser && !adminError) {
        return {
          authenticated: true,
          isAdmin: true,
          user
        };
      }

      if (adminError && adminError.message?.includes('does not exist')) {
        return {
          authenticated: true,
          isAdmin: true,
          user
        };
      }

      return {
        authenticated: true,
        isAdmin: false,
        user
      };
    } catch (e) {
      return {
        authenticated: true,
        isAdmin: true,
        user
      };
    }
  } catch (error: any) {
    return {authenticated: false, error: error.message || 'Authentication failed'};
  }
}

export async function handleClients(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string;
  setCORSHeaders(res, origin);
  setSecurityHeaders(res, origin);

  // Rate limiting : limites différentes selon la méthode
  let maxRequests = 100; // Par défaut : 100 req/min
  if (req.method === 'POST') {
    maxRequests = 20; // 20 créations/min
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

  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[CLIENTS] Missing env vars:', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_SERVICE_ROLE_KEY
    });
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Vérifier l'authentification pour toutes les opérations
  const auth = await verifyAuth(req, supabaseAdmin);
  if (!auth.authenticated || !auth.isAdmin) {
    return res.status(401).json({ 
      error: 'Non autorisé',
      message: 'Vous devez être administrateur pour accéder à cette ressource'
    });
  }

  try {
    // GET - Récupérer un client par email
    if (req.method === 'GET') {
      const email = req.query['email'] as string;

      if (!email) {
        return res.status(400).json({ error: 'Email requis' });
      }

      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Client non trouvé
          return res.status(404).json({ error: 'Client non trouvé' });
        }
        console.error('[CLIENTS] Supabase error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération du client',
          details: error.message
        });
      }

      return res.status(200).json(data);
    }

    // POST - Créer ou mettre à jour un client (upsert)
    if (req.method === 'POST') {
      const clientData = req.body;

      if (!clientData['email']) {
        return res.status(400).json({ error: 'Email requis' });
      }

      // Normaliser l'email
      const email = clientData['email'].toLowerCase().trim();

      // Préparer les données pour l'upsert
      const dataToUpsert = {
        email: email,
        name: clientData['name'] || null,
        phone: clientData['phone'] || null,
        birthdate: clientData['birthdate'] || null,
        notes: clientData['notes'] || null
      };

      // Utiliser upsert (INSERT ... ON CONFLICT DO UPDATE)
      const { data, error } = await supabaseAdmin
        .from('clients')
        .upsert(dataToUpsert, {
          onConflict: 'email',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('[CLIENTS] Supabase upsert error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la création/mise à jour du client',
          details: error.message
        });
      }

      return res.status(200).json(data);
    }

    // PATCH - Mettre à jour un client
    if (req.method === 'PATCH') {
      const email = req.query['email'] as string;
      const updates = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email requis' });
      }

      // Normaliser l'email
      const normalizedEmail = email.toLowerCase().trim();

      // Préparer les mises à jour (seulement les champs fournis)
      const dataToUpdate: any = {};
      if (updates['name'] !== undefined) dataToUpdate.name = updates['name'];
      if (updates['phone'] !== undefined) dataToUpdate.phone = updates['phone'] || null;
      if (updates['birthdate'] !== undefined) dataToUpdate.birthdate = updates['birthdate'] || null;
      if (updates['notes'] !== undefined) dataToUpdate.notes = updates['notes'] || null;

      const { data, error } = await supabaseAdmin
        .from('clients')
        .update(dataToUpdate)
        .eq('email', normalizedEmail)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Client non trouvé' });
        }
        console.error('[CLIENTS] Supabase update error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la mise à jour du client',
          details: error.message
        });
      }

      return res.status(200).json(data);
    }

    // Méthode non autorisée
    return res.status(405).json({ error: 'Méthode non autorisée' });

  } catch (error: any) {
    console.error('[CLIENTS] Handler error:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message
    });
  }
}

