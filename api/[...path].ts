import {createClient, SupabaseClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {rateLimitMiddleware} from './utils/rate-limiter.js';
import {applyRateLimit, getAllowedOrigins, setCORSHeaders, setSecurityHeaders} from './utils/security-helpers.js';
import {sanitizeAppointment, validateAppointment, validateAppointmentQuery} from './utils/validation.js';

/**
 * Détermine l'origine CORS à autoriser
 * Si credentials sont activés, on ne peut pas utiliser '*', il faut une origine spécifique
 */
function getCORSOrigin(requestOrigin?: string): string {
  if (requestOrigin) {
    if (requestOrigin.includes('.vercel.app') || requestOrigin.includes('localhost')) {
      return requestOrigin;
    }
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.length > 0 && allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return requestOrigin;
  }
  return '*';
}

/**
 * Fonction pour vérifier l'authentification et les droits admin
 */
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
        return {authenticated: true, isAdmin: true, user};
      }

      if (adminError && adminError.message?.includes('does not exist')) {
        console.warn('⚠️ Table admin n\'existe pas, utilisateur authentifié considéré comme admin');
        return {authenticated: true, isAdmin: true, user};
      }

      if (adminError && adminError.code === 'PGRST116') {
        const { count, error: countError } = await supabaseAdmin
          .from('admin')
          .select('*', { count: 'exact', head: true });

        if (countError || count === 0 || count === null) {
          try {
            const { error: insertError } = await supabaseAdmin
              .from('admin')
              .insert([{ id: user.id, email: user.email || '' }]);

            if (!insertError) {
              console.log(`✅ Utilisateur ${user.email} ajouté automatiquement comme admin`);
              return {authenticated: true, isAdmin: true, user};
            }
          } catch (insertErr: any) {
            if (count === 0) {
              return {authenticated: true, isAdmin: true, user};
            }
          }
        }
      }

      return {
        authenticated: true,
        isAdmin: false,
        user,
        error: 'User is not an admin'
      };
    } catch (adminCheckError: any) {
      if (adminCheckError.message?.includes('does not exist')) {
        return {authenticated: true, isAdmin: true, user};
      }
      return {authenticated: true, isAdmin: false, user, error: 'Unable to verify admin status'};
    }
  } catch (error: any) {
    return {authenticated: false, error: error.message || 'Authentication failed'};
  }
}

/**
 * Fonction utilitaire pour formater les minutes en HH:MM
 */
function formatTimeMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Routeur principal pour toutes les routes API (catch-all)
 * Consolide toutes les fonctions API en une seule Serverless Function
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ⚠️ CRITIQUE : Définir les headers CORS IMMÉDIATEMENT
  const origin = req.headers.origin as string;
  const allowedOrigin = getCORSOrigin(origin);
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  console.log(`[API Router] Method: ${req.method}, Origin: ${origin || 'none'}, Allowed: ${allowedOrigin}`);
  
  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  setSecurityHeaders(res, origin);
  
  // Extraire le chemin depuis req.query.path (catch-all route)
  const pathArray = req.query['path'] as string | string[] | undefined;
  let path = '';
  
  if (pathArray) {
    if (Array.isArray(pathArray)) {
      path = pathArray.join('/');
    } else {
      path = pathArray;
    }
  } else {
    // Fallback : utiliser req.url
    const url = req.url || '';
    path = url.split('?')[0].replace('/api/', '');
  }
  
  // Vérifier les variables d'environnement Supabase
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[API Router] Missing env vars');
    return res.status(500).json({ 
      error: 'Configuration serveur incomplète',
      message: 'Variables d\'environnement Supabase manquantes'
    });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Router vers le handler approprié
  try {
    switch (path) {
      case 'prestations':
        return await handlePrestations(req, res, supabase);
      
      case 'creations':
        return await handleCreations(req, res, supabase);
      
      case 'testimonials':
        return await handleTestimonials(req, res, supabase);
      
      case 'faqs':
        return await handleFaqs(req, res, supabase);
      
      case 'about':
        return await handleAbout(req, res, supabase);
      
      case 'available-slots':
        return await handleAvailableSlots(req, res, supabase);
      
      case 'blocked-dates':
        return await handleBlockedDates(req, res, supabase);
      
      case 'opening-hours':
        return await handleOpeningHours(req, res, supabase);
      
      case 'appointments':
        return await handleAppointments(req, res, supabase);
      
      case 'clients':
        return await handleClients(req, res, supabase);
      
      default:
        return res.status(404).json({ 
          error: 'Route not found',
          message: `No handler found for path: ${path}`
        });
    }
  } catch (error: any) {
    console.error('[API Router] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}

// ==================== HANDLERS SIMPLES ====================

async function handlePrestations(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, OPTIONS', 'Content-Type');
  if (!applyRateLimit(req, res, 100)) return;
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('prestations')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des prestations', details: error.message });
    }
    return res.json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCreations(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, OPTIONS', 'Content-Type');
  if (!applyRateLimit(req, res, 100)) return;
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('creations')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des créations', details: error.message });
    }
    return res.json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleTestimonials(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, OPTIONS', 'Content-Type');
  if (!applyRateLimit(req, res, 100)) return;
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des témoignages', details: error.message });
    }
    return res.json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleFaqs(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, OPTIONS', 'Content-Type');
  if (!applyRateLimit(req, res, 100)) return;
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des FAQs', details: error.message });
    }
    return res.json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleAbout(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, OPTIONS', 'Content-Type');
  if (!applyRateLimit(req, res, 100)) return;
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('about_content')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération du contenu', details: error.message });
    }
    return res.json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleAvailableSlots(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, OPTIONS', 'Content-Type');
  if (!applyRateLimit(req, res, 100)) return;
  
  if (req.method === 'GET') {
    const { day_of_week } = req.query;
    
    if (day_of_week && (typeof day_of_week !== 'string' || isNaN(parseInt(day_of_week)))) {
      return res.status(400).json({ error: 'Invalid day_of_week parameter' });
    }

    let query = supabase
      .from('available_slots')
      .select('*')
      .eq('is_active', true);

    if (day_of_week && typeof day_of_week === 'string') {
      const dayNum = parseInt(day_of_week);
      if (dayNum >= 0 && dayNum <= 6) {
        query = query.eq('day_of_week', dayNum);
      } else {
        return res.status(400).json({ error: 'day_of_week must be between 0 and 6' });
      }
    }

    const { data, error } = await query
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des créneaux', details: error.message });
    }
    return res.json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleBlockedDates(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, OPTIONS', 'Content-Type');
  
  const rateLimit = rateLimitMiddleware(req, 100, 60000);
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  if (!rateLimit.allowed) {
    const resetTimeStr = rateLimit.headers['X-RateLimit-Reset'];
    const resetTime = new Date(resetTimeStr).getTime();
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', Math.max(1, retryAfter).toString());
    return res.status(429).json({
      error: 'Trop de requêtes',
      message: 'Limite de 100 requêtes par minute dépassée',
      retryAfter: Math.max(1, retryAfter)
    });
  }
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('*')
      .gte('blocked_date', new Date().toISOString().split('T')[0])
      .order('blocked_date', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des dates bloquées', details: error.message });
    }
    return res.json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== HANDLERS COMPLEXES ====================

async function handleOpeningHours(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, PATCH, OPTIONS', 'Content-Type, Authorization');
  
  const maxRequests = req.method === 'PATCH' ? 30 : 100;
  const rateLimit = rateLimitMiddleware(req, maxRequests, 60000);
  
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
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

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('opening_hours')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des horaires', details: error.message });
    }
    return res.json(data);
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing opening hours ID' });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof id !== 'string' || !uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid opening hours ID format' });
    }

    const auth = await verifyAuth(req, supabase);
    if (!auth.authenticated || !auth.isAdmin) {
      return res.status(auth.authenticated ? 403 : 401).json({ 
        error: auth.authenticated ? 'Forbidden: Admin access required' : 'Unauthorized'
      });
    }

    const allowedFields = ['day_of_week', 'day_name', 'periods', 'last_appointment', 'is_active', 'display_order'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.day_of_week !== undefined && (updateData.day_of_week < 0 || updateData.day_of_week > 6)) {
      return res.status(400).json({ error: 'day_of_week must be between 0 and 6' });
    }

    const { data, error } = await supabase
      .from('opening_hours')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour des horaires', details: error.message });
    }

    return res.json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleAppointments(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, POST, PATCH, OPTIONS', 'Content-Type, Authorization');
  
  let maxRequests = 100;
  if (req.method === 'POST') {
    maxRequests = 20;
  } else if (req.method === 'PATCH') {
    maxRequests = 30;
  }
  
  const rateLimit = rateLimitMiddleware(req, maxRequests, 60000);
  
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
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

  if (req.method === 'GET') {
    const { status, startDate, endDate } = req.query;

    const queryValidation = validateAppointmentQuery({ status, startDate, endDate });
    if (!queryValidation.valid) {
      return res.status(400).json({ error: 'Paramètres invalides', details: queryValidation.errors });
    }

    let query = supabase.from('appointments').select(`
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

    const { data, error } = await query
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des rendez-vous', details: error.message });
    }

    return res.json(data);
  }

  if (req.method === 'POST') {
    const validation = validateAppointment(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Données invalides', details: validation.errors });
    }

    const sanitizedData = sanitizeAppointment(req.body);
    const { appointment_date, appointment_time } = sanitizedData;
    
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('appointment_date', appointment_date)
      .in('status', ['pending', 'accepted']);

    if (checkError) {
      return res.status(500).json({ error: 'Erreur lors de la vérification des créneaux', details: checkError.message });
    }

    if (existingAppointments && existingAppointments.length > 0) {
      const [newHour, newMin] = appointment_time.split(':').map(Number);
      const newTime = newHour * 60 + newMin;
      
      for (const apt of existingAppointments) {
        const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number);
        const aptTime = aptHour * 60 + aptMin;
        const blockStart = aptTime;
        const blockEnd = aptTime + 90;
        
        if (newTime >= blockStart && newTime < blockEnd) {
          return res.status(409).json({ 
            error: 'Ce créneau est déjà réservé',
            message: `Un rendez-vous existe à ${apt.appointment_time} et bloque les créneaux jusqu'à ${formatTimeMinutes(blockEnd)}`
          });
        }
      }
    }

    const { data, error } = await supabase
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
      return res.status(500).json({ error: 'Erreur lors de la création du rendez-vous', details: error.message });
    }

    return res.status(201).json(data);
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing appointment ID' });
    }

    const auth = await verifyAuth(req, supabase);
    if (!auth.authenticated || !auth.isAdmin) {
      return res.status(auth.authenticated ? 403 : 401).json({ 
        error: auth.authenticated ? 'Forbidden: Admin access required' : 'Unauthorized'
      });
    }

    const updateData: any = {
      status: req.body.status?.toLowerCase()?.trim()
    };
    
    if (req.body.notes !== undefined && req.body.notes !== null) {
      updateData.notes = req.body.notes;
    }

    const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
    if (!updateData.status || !validStatuses.includes(updateData.status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const { data, error } = await supabase
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
      return res.status(500).json({ error: 'Erreur lors de la mise à jour', details: error.message });
    }

    return res.json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleClients(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, POST, PATCH, OPTIONS', 'Content-Type, Authorization');
  
  let maxRequests = 100;
  if (req.method === 'POST') {
    maxRequests = 20;
  } else if (req.method === 'PATCH') {
    maxRequests = 30;
  }
  
  const rateLimit = rateLimitMiddleware(req, maxRequests, 60000);
  
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
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

  const auth = await verifyAuth(req, supabase);
  if (!auth.authenticated || !auth.isAdmin) {
    return res.status(401).json({ 
      error: 'Non autorisé',
      message: 'Vous devez être administrateur pour accéder à cette ressource'
    });
  }

  if (req.method === 'GET') {
    const email = req.query['email'] as string;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Client non trouvé' });
      }
      return res.status(500).json({ error: 'Erreur lors de la récupération du client', details: error.message });
    }

    return res.json(data);
  }

  if (req.method === 'POST') {
    const clientData = req.body;

    if (!clientData['email']) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const email = clientData['email'].toLowerCase().trim();

    const dataToUpsert = {
      email: email,
      name: clientData['name'] || null,
      phone: clientData['phone'] || null,
      birthdate: clientData['birthdate'] || null,
      notes: clientData['notes'] || null
    };

    const { data, error } = await supabase
      .from('clients')
      .upsert(dataToUpsert, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la création/mise à jour du client', details: error.message });
    }

    return res.json(data);
  }

  if (req.method === 'PATCH') {
    const email = req.query['email'] as string;
    const updates = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const dataToUpdate: any = {};
    if (updates['name'] !== undefined) dataToUpdate.name = updates['name'];
    if (updates['phone'] !== undefined) dataToUpdate.phone = updates['phone'] || null;
    if (updates['birthdate'] !== undefined) dataToUpdate.birthdate = updates['birthdate'] || null;
    if (updates['notes'] !== undefined) dataToUpdate.notes = updates['notes'] || null;

    const { data, error } = await supabase
      .from('clients')
      .update(dataToUpdate)
      .eq('email', normalizedEmail)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Client non trouvé' });
      }
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du client', details: error.message });
    }

    return res.json(data);
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
