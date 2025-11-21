import {createClient, SupabaseClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {findClientById, generateClientId, verifyClientId} from './utils/client-id.js';
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
  res.setHeader('Content-Type', 'application/json');
  
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
    // Fallback : utiliser req.url directement
    const url = req.url || '';
    // Enlever /api/ du début si présent
    const cleanUrl = url.split('?')[0];
    if (cleanUrl.startsWith('/api/')) {
      path = cleanUrl.substring(5); // Enlever '/api/'
    } else if (cleanUrl.startsWith('/api')) {
      path = cleanUrl.substring(4); // Enlever '/api'
    } else {
      path = cleanUrl.replace(/^\//, ''); // Enlever le premier /
    }
  }
  
  console.log(`[API Router] Extracted path: "${path}" from query:`, req.query, 'url:', req.url);
  
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
    // Normaliser le chemin (enlever les espaces, etc.)
    const normalizedPath = path.trim().toLowerCase();
    
    console.log(`[API Router] Routing to: "${normalizedPath}"`);
    
    switch (normalizedPath) {
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
        console.error(`[API Router] Route not found: "${normalizedPath}" (original: "${path}")`);
        return res.status(404).json({ 
          error: 'Route not found',
          message: `No handler found for path: ${path}`,
          debug: {
            path,
            normalizedPath,
            query: req.query,
            url: req.url
          }
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
  res.setHeader('Content-Type', 'application/json');
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
  res.setHeader('Content-Type', 'application/json');
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
  res.setHeader('Content-Type', 'application/json');
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
  res.setHeader('Content-Type', 'application/json');
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
  res.setHeader('Content-Type', 'application/json');
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
  res.setHeader('Content-Type', 'application/json');
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
  res.setHeader('Content-Type', 'application/json');
  
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
  res.setHeader('Content-Type', 'application/json');
  
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
  res.setHeader('Content-Type', 'application/json');
  
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
      const newEndTime = newTime + 90; // Fin du nouveau rendez-vous (+1h30)
      
      for (const apt of existingAppointments) {
        const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number);
        const aptTime = aptHour * 60 + aptMin;
        
        // Plage bloquée : de 1h30 avant le rendez-vous jusqu'à 1h30 après
        // Exemple: rendez-vous à 11h30 (690 min) → bloque de 10h00 (600 min) à 13h00 (780 min)
        const blockStart = Math.max(0, aptTime - 90); // Ne pas aller avant minuit
        const blockEnd = aptTime + 90; // +1h30 après
        
        // Bloquer si :
        // 1. Le créneau commence dans la plage bloquée (inclus le début, exclu la fin)
        // 2. OU le créneau se termine moins de 1h30 avant le début du rendez-vous
        //    (créneaux qui commencent avant blockStart mais se terminent après blockStart)
        const startsInBlockedRange = newTime >= blockStart && newTime < blockEnd;
        const endsTooCloseBefore = newTime < blockStart && newEndTime > blockStart;
        
        if (startsInBlockedRange || endsTooCloseBefore) {
          return res.status(409).json({ 
            error: 'Ce créneau est déjà réservé',
            message: `Un rendez-vous existe à ${apt.appointment_time} et bloque les créneaux de ${formatTimeMinutes(blockStart)} à ${formatTimeMinutes(blockEnd)}`
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

    // DEBUG: Logger les données retournées
    console.log('[Appointments POST] ========== DEBUG ==========');
    console.log('[Appointments POST] Data reçue:', JSON.stringify(data, null, 2));
    console.log('[Appointments POST] data existe?', !!data);
    console.log('[Appointments POST] data.client_email existe?', !!data?.client_email);
    console.log('[Appointments POST] data.client_email valeur:', data?.client_email);
    console.log('[Appointments POST] Toutes les clés de data:', data ? Object.keys(data) : 'data est null');
    console.log('[Appointments POST] ============================');

    // Créer automatiquement le client dans la table clients s'il n'existe pas
    // Utiliser sanitizedData au cas où data n'a pas client_email
    const emailToUse = data?.client_email || sanitizedData?.client_email;
    
    if (emailToUse) {
      const clientEmail = emailToUse.toLowerCase().trim();
      const clientName = data?.client_name || sanitizedData?.client_name || null;
      const clientPhone = data?.client_phone || sanitizedData?.client_phone || null;
      
      console.log(`[Appointments POST] ===== CRÉATION CLIENT =====`);
      console.log(`[Appointments POST] Email: "${clientEmail}"`);
      console.log(`[Appointments POST] Nom: "${clientName || 'null'}"`);
      console.log(`[Appointments POST] Téléphone: "${clientPhone || 'null'}"`);
      
      try {
        // ÉTAPE 1: Vérifier si le client existe déjà
        console.log(`[Appointments POST] ÉTAPE 1: Vérification existence...`);
        const { data: existingClient, error: checkError } = await supabase
          .from('clients')
          .select('id, email')
          .eq('email', clientEmail)
          .maybeSingle();
        
        if (checkError) {
          console.error(`[Appointments POST] ❌ Erreur vérification:`, checkError);
        }
        
        if (existingClient) {
          console.log(`[Appointments POST] ✅ Client existe déjà: ${clientEmail} (ID: ${existingClient.id})`);
        } else {
          console.log(`[Appointments POST] ÉTAPE 2: Client n'existe pas, INSERT en cours...`);
          
          // ÉTAPE 2: Insérer le client (SIMPLE - juste les champs de base)
          // Validation et limitation de taille pour la sécurité
          const clientData: any = {
            email: clientEmail,
            name: ((data?.client_name || sanitizedData?.client_name) || '').trim().substring(0, 100) || null, // Max 100 caractères
            phone: ((data?.client_phone || sanitizedData?.client_phone) || '').trim().substring(0, 20) || null // Max 20 caractères
          };
          
          // Validation supplémentaire de l'email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(clientData.email)) {
            console.error(`[Appointments POST] ❌ Email invalide: "${clientData.email}"`);
            // Ne pas créer le client si l'email est invalide
            return;
          }
          
          console.log(`[Appointments POST] Données à insérer:`, JSON.stringify(clientData, null, 2));
          
          const { data: insertedClient, error: insertError } = await supabase
            .from('clients')
            .insert(clientData)
            .select()
            .single();
          
          if (insertError) {
            console.error(`[Appointments POST] ❌ ERREUR INSERT:`);
            console.error(`[Appointments POST] Code: ${insertError.code}`);
            console.error(`[Appointments POST] Message: ${insertError.message}`);
            console.error(`[Appointments POST] Détails:`, JSON.stringify(insertError, null, 2));
            
            // Si erreur de duplication, le client existe maintenant - on continue
            if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
              console.log(`[Appointments POST] ⚠️ Client créé entre temps, on continue...`);
            }
          } else if (insertedClient) {
            console.log(`[Appointments POST] ✅✅✅ CLIENT CRÉÉ AVEC SUCCÈS!`);
            console.log(`[Appointments POST] ID: ${insertedClient.id}`);
            console.log(`[Appointments POST] Email: ${insertedClient.email}`);
            console.log(`[Appointments POST] Nom: ${insertedClient.name}`);
          } else {
            console.error(`[Appointments POST] ❌ Insert réussi mais aucune donnée retournée!`);
          }
        }
        console.log(`[Appointments POST] ===== FIN CRÉATION CLIENT =====`);
      } catch (error: any) {
        console.error('[Appointments POST] ❌ EXCEPTION lors de la création du client:', error);
        console.error('[Appointments POST] Stack:', error.stack);
      }
    } else {
      console.log('[Appointments POST] ⚠️ Pas de client_email dans les données');
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

    const updateData: any = {};
    
    // Gérer le statut si fourni
    if (req.body.status !== undefined) {
      updateData.status = req.body.status?.toLowerCase()?.trim();
      const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
      if (!updateData.status || !validStatuses.includes(updateData.status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
    }
    
    // Gérer les notes si fournies
    if (req.body.notes !== undefined && req.body.notes !== null) {
      updateData.notes = req.body.notes;
    }
    
    // Gérer le mode de paiement si fourni
    if (req.body.payment_method !== undefined) {
      const validPaymentMethods = ['espèces', 'carte', 'virement', 'chèque', null];
      if (req.body.payment_method !== null && !validPaymentMethods.includes(req.body.payment_method)) {
        return res.status(400).json({ 
          error: `Invalid payment_method. Must be one of: ${validPaymentMethods.filter(m => m !== null).join(', ')}, or null` 
        });
      }
      updateData.payment_method = req.body.payment_method;
    }
    
    // Vérifier qu'au moins un champ est fourni
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields to update' 
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
  res.setHeader('Content-Type', 'application/json');
  
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
    // Décoder correctement les paramètres de requête
    const emailParam = req.query['email'];
    const email = emailParam ? decodeURIComponent(String(emailParam)) : undefined;
    const id = req.query['id'] as string; // UUID de la base
    const clientIdParam = req.query['clientId'];
    const clientId = clientIdParam ? decodeURIComponent(String(clientIdParam)) : undefined;

    console.log('[Clients GET] Params:', { email, id, clientId, rawQuery: req.query });

    if (!email && !id && !clientId) {
      return res.status(400).json({ error: 'Email, ID ou clientId requis' });
    }

    let data;
    let error;

    let searchEmail: string | null = null;

    if (clientId) {
      // Recherche par identifiant opaque (recommandé pour les URLs)
      data = await findClientById(supabase, clientId);
      if (!data) {
        // Si le client n'est pas trouvé, chercher dans les rendez-vous pour créer le client
        // findClientById devrait déjà le faire, mais si ça échoue, on essaie ici
        console.log(`[Clients GET] Client non trouvé par clientId: ${clientId}, recherche dans les rendez-vous...`);
        
        // Récupérer tous les rendez-vous pour trouver l'email correspondant
        const { data: allAppointments, error: aptError } = await supabase
          .from('appointments')
          .select('client_email, client_name, client_phone')
          .limit(1000);
        
        if (!aptError && allAppointments) {
          // Chercher l'email correspondant au clientId
          for (const apt of allAppointments) {
            if (apt.client_email && verifyClientId(clientId, apt.client_email)) {
              searchEmail = apt.client_email.toLowerCase().trim();
              console.log(`[Clients GET] Email trouvé pour clientId ${clientId}: ${searchEmail}`);
              break;
            }
          }
        }
        
        // Si on a trouvé un email, créer le client
        if (searchEmail) {
          // Le code ci-dessous créera le client automatiquement
          error = { code: 'PGRST116' }; // Simuler l'erreur pour déclencher la création
        } else {
          return res.status(404).json({ error: 'Client non trouvé' });
        }
      } else {
        searchEmail = data.email;
      }
    } else if (id) {
      // Recherche par UUID (pour compatibilité, mais non recommandé)
      const result = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      data = result.data;
      error = result.error;
      if (data) searchEmail = data.email;
    } else if (email) {
      // Recherche par email (pour compatibilité)
      searchEmail = email.toLowerCase().trim();
      const result = await supabase
        .from('clients')
        .select('*')
        .eq('email', searchEmail)
        .single();
      data = result.data;
      error = result.error;
    } else {
      return res.status(400).json({ error: 'Email, ID ou clientId requis' });
    }

    // Si le client n'existe pas dans la table clients, vérifier s'il existe dans les rendez-vous
    if (error && error.code === 'PGRST116' && searchEmail) {
      // Chercher dans les rendez-vous pour créer le client automatiquement
      console.log(`[Clients GET] Client non trouvé, recherche dans les rendez-vous pour: "${searchEmail}"`);
      
      // Normaliser l'email pour la recherche (lowercase, trim)
      const normalizedSearchEmail = searchEmail.toLowerCase().trim();
      
      // Chercher avec l'email normalisé (utiliser eq car les emails sont normalisés en lowercase)
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('client_name, client_email, client_phone')
        .eq('client_email', normalizedSearchEmail)
        .limit(1);
      
      if (aptError) {
        console.error('[Clients GET] Erreur lors de la recherche dans les rendez-vous:', aptError);
        return res.status(500).json({ error: 'Erreur lors de la recherche', details: aptError.message });
      }
      
      console.log(`[Clients GET] Nombre de rendez-vous trouvés: ${appointments?.length || 0}`);
      
      if (appointments && appointments.length > 0) {
        // Prendre le premier rendez-vous trouvé
        const appointment = appointments[0];
        const appointmentEmail = appointment.client_email?.toLowerCase().trim();
        
        if (!appointmentEmail) {
          console.error('[Clients GET] Email manquant dans le rendez-vous');
          return res.status(404).json({ error: 'Client non trouvé' });
        }
        
        console.log(`[Clients GET] Rendez-vous trouvé pour "${appointmentEmail}", création du client...`);
        console.log(`[Clients GET] Données du rendez-vous:`, {
          name: appointment.client_name,
          email: appointmentEmail,
          phone: appointment.client_phone
        });
        
        // Créer le client automatiquement à partir des données du rendez-vous
        const clientIdHash = generateClientId(appointmentEmail);
        const clientData: any = {
          email: appointmentEmail,
          name: appointment.client_name || null,
          phone: appointment.client_phone || null
        };
        
        console.log(`[Clients GET] Tentative de création avec client_id: ${clientIdHash}`);
        
        // Essayer avec insert d'abord (plus simple et fiable)
        let { data: newClient, error: createError } = await supabase
          .from('clients')
          .insert({
            ...clientData,
            client_id: clientIdHash
          })
          .select()
          .single();
        
        // Si erreur de duplication (client existe déjà), récupérer le client existant
        if (createError && (
          createError.code === '23505' || // Violation de contrainte unique
          createError.message?.includes('duplicate') ||
          createError.message?.includes('unique') ||
          createError.message?.includes('already exists')
        )) {
          console.log('[Clients GET] Client existe déjà, récupération...');
          const { data: existingClientNow, error: fetchError } = await supabase
            .from('clients')
            .select('*')
            .eq('email', appointmentEmail)
            .single();
          
          if (!fetchError && existingClientNow) {
            newClient = existingClientNow;
            createError = null;
            console.log(`[Clients GET] ✅ Client récupéré: ${appointmentEmail} (ID: ${existingClientNow.id})`);
          } else {
            createError = fetchError || createError;
          }
        }
        // Si erreur liée à client_id (colonne n'existe pas), réessayer sans
        else if (createError && (
          createError.message?.includes('client_id') || 
          createError.code === '42703' || 
          createError.code === '42P01' ||
          createError.message?.includes('column') ||
          createError.message?.includes('does not exist')
        )) {
          console.log('[Clients GET] Colonne client_id non disponible, création sans client_id');
          const retry = await supabase
            .from('clients')
            .insert(clientData)
            .select()
            .single();
          
          if (!retry.error && retry.data) {
            newClient = retry.data;
            createError = null;
            console.log(`[Clients GET] ✅ Client créé (sans client_id): ${appointmentEmail}`);
          } else if (retry.error && (
            retry.error.code === '23505' ||
            retry.error.message?.includes('duplicate') ||
            retry.error.message?.includes('unique') ||
            retry.error.message?.includes('already exists')
          )) {
            // Client créé entre temps, récupérer
            console.log('[Clients GET] Client créé entre temps, récupération...');
            const { data: existingClientNow, error: fetchError } = await supabase
              .from('clients')
              .select('*')
              .eq('email', appointmentEmail)
              .single();
            
            if (!fetchError && existingClientNow) {
              newClient = existingClientNow;
              createError = null;
              console.log(`[Clients GET] ✅ Client récupéré: ${appointmentEmail} (ID: ${existingClientNow.id})`);
            } else {
              createError = fetchError || retry.error;
            }
          } else {
            createError = retry.error;
          }
        }
        
        if (createError) {
          console.error('[Clients GET] ❌ Erreur lors de la création automatique:', createError);
          console.error('[Clients GET] Code erreur:', createError.code);
          console.error('[Clients GET] Message:', createError.message);
          console.error('[Clients GET] Détails:', JSON.stringify(createError, null, 2));
          return res.status(500).json({ error: 'Erreur lors de la création du client', details: createError.message });
        }
        
        if (!newClient) {
          console.error('[Clients GET] ❌ Client créé mais aucune donnée retournée');
          return res.status(500).json({ error: 'Erreur: Client créé mais données non récupérées' });
        }
        
        data = newClient;
        error = null;
        console.log(`[Clients GET] ✅ Client créé automatiquement depuis les rendez-vous: ${appointmentEmail}`);
        console.log(`[Clients GET] Client créé avec ID: ${newClient.id}`);
      } else {
        console.log(`[Clients GET] ❌ Aucun rendez-vous trouvé pour: "${normalizedSearchEmail}"`);
        // Chercher aussi sans normalisation au cas où
        const { data: allAppointments } = await supabase
          .from('appointments')
          .select('client_email')
          .limit(10);
        console.log(`[Clients GET] Exemples d'emails dans les rendez-vous:`, allAppointments?.map((a: any) => a.client_email));
        return res.status(404).json({ error: 'Client non trouvé' });
      }
    } else if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Client non trouvé' });
      }
      return res.status(500).json({ error: 'Erreur lors de la récupération du client', details: error.message });
    }

    // Ajouter l'identifiant opaque dans la réponse (utiliser celui de la base ou le générer)
    if (data && data.email) {
      data.clientId = data.client_id || generateClientId(data.email);
    }

    return res.json(data);
  }
  
  if (req.method === 'POST') {
    const clientData = req.body;

    if (!clientData['email']) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const email = clientData['email'].toLowerCase().trim();
    const clientId = generateClientId(email);

    const dataToUpsert = {
      email: email,
      name: clientData['name'] || null,
      phone: clientData['phone'] || null,
      birthdate: clientData['birthdate'] || null,
      notes: clientData['notes'] || null,
      client_id: clientId // Stocker le client_id dans la base
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

    // Ajouter l'identifiant opaque dans la réponse (pour compatibilité)
    if (data && data.email) {
      data.clientId = data.client_id || generateClientId(data.email);
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
    
    // S'assurer que le client_id est à jour lors de la mise à jour
    const clientId = generateClientId(normalizedEmail);

    const dataToUpdate: any = {
      client_id: clientId // Toujours mettre à jour le client_id
    };
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

    // Ajouter clientId dans la réponse (pour compatibilité)
    if (data) {
      data.clientId = data.client_id || generateClientId(data.email);
    }

    return res.json(data);
}

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
