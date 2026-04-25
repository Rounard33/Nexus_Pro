import {createClient, SupabaseClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {findClientById, generateClientId, verifyClientId} from '../lib/vercel-api-utils/client-id.js';
import {rateLimitMiddleware} from '../lib/vercel-api-utils/rate-limiter.js';
import {applyRateLimit, getAllowedOrigins, setCORSHeaders, setSecurityHeaders} from '../lib/vercel-api-utils/security-helpers.js';
import {sanitizeAppointment, validateAppointment, validateAppointmentQuery, validateCaptchaToken} from '../lib/vercel-api-utils/validation.js';
import {
  formatNotesWithAdditionalSales,
  parseAdditionalSalesFromNotes,
  type AdditionalSaleRecord
} from '../lib/vercel-api-utils/additional-sales-notes.js';

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
 * Convertit une durée texte en minutes (ex: "1h30" → 90, "45min" → 45)
 */
function parseDurationToMinutes(duration: string | null | undefined): number {
  if (!duration) return 90; // Durée par défaut
  
  const normalized = duration.toLowerCase().trim();
  let totalMinutes = 0;
  
  // Pattern pour "1h30", "1h", "2h15", etc.
  const hourMatch = normalized.match(/(\d+)\s*h(?:(\d+))?/);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
    if (hourMatch[2]) {
      totalMinutes += parseInt(hourMatch[2]);
    }
  }
  
  // Pattern pour "45min", "30 min", etc. (si pas déjà inclus dans heures)
  if (!hourMatch) {
    const minMatch = normalized.match(/(\d+)\s*min/);
    if (minMatch) {
      totalMinutes += parseInt(minMatch[1]);
    }
  }
  
  return totalMinutes > 0 ? totalMinutes : 90; // 90 min par défaut si parsing échoue
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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

      case 'blocked-slots':
        return await handleBlockedSlots(req, res, supabase);

      case 'gift-cards':
        return await handleGiftCards(req, res, supabase);
      
      case 'opening-hours':
        return await handleOpeningHours(req, res, supabase);
      
      case 'appointments':
        return await handleAppointments(req, res, supabase);
      
      case 'clients':
        return await handleClients(req, res, supabase);
      
      case 'contact':
        return await handleContact(req, res);
      
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

async function handleBlockedSlots(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, POST, DELETE, OPTIONS', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  const maxRequests = req.method === 'GET' ? 100 : 30;
  const rateLimit = rateLimitMiddleware(req, maxRequests, 60000);
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  if (!rateLimit.allowed) {
    const resetTimeStr = rateLimit.headers['X-RateLimit-Reset'];
    const retryAfter = Math.ceil((new Date(resetTimeStr).getTime() - Date.now()) / 1000);
    res.setHeader('Retry-After', Math.max(1, retryAfter).toString());
    return res.status(429).json({ error: 'Trop de requêtes', retryAfter: Math.max(1, retryAfter) });
  }

  if (req.method === 'GET') {
    const { startDate, endDate } = req.query;
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('blocked_slots')
      .select('*')
      .gte('blocked_date', (startDate as string) || today)
      .order('blocked_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (endDate && typeof endDate === 'string') {
      query = query.lte('blocked_date', endDate);
    }
    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des créneaux bloqués', details: error.message });
    }
    return res.json(data);
  }

  if (req.method === 'POST') {
    const auth = await verifyAuth(req, supabase);
    if (!auth.authenticated || !auth.isAdmin) {
      return res.status(auth.authenticated ? 403 : 401).json({
        error: auth.authenticated ? 'Forbidden: Admin access required' : 'Unauthorized'
      });
    }
    const { blocked_date, start_time, reason } = req.body || {};
    if (!blocked_date || !start_time) {
      return res.status(400).json({ error: 'blocked_date et start_time sont requis' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(blocked_date)) {
      return res.status(400).json({ error: 'blocked_date doit être au format YYYY-MM-DD' });
    }
    const timeMatch = start_time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!timeMatch) {
      return res.status(400).json({ error: 'start_time doit être au format HH:MM ou HH:MM:SS' });
    }
    const normalizedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}:00`;
    const { data, error } = await supabase
      .from('blocked_slots')
      .insert([{ blocked_date, start_time: normalizedTime, reason: reason || null }])
      .select('*')
      .single();
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la création du créneau bloqué', details: error.message });
    }
    return res.status(201).json(data);
  }

  if (req.method === 'DELETE') {
    const auth = await verifyAuth(req, supabase);
    if (!auth.authenticated || !auth.isAdmin) {
      return res.status(auth.authenticated ? 403 : 401).json({
        error: auth.authenticated ? 'Forbidden: Admin access required' : 'Unauthorized'
      });
    }
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id est requis' });
    }
    const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la suppression', details: error.message });
    }
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function parseGiftCardAmountEur(body: Record<string, unknown>): number | null {
  const v = body['amount_eur'];
  if (v == null || v === '') return null;
  if (typeof v === 'number' && !Number.isNaN(v) && v > 0) {
    return Math.round(v * 100) / 100;
  }
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.').trim());
    if (!Number.isNaN(n) && n > 0) return Math.round(n * 100) / 100;
  }
  return null;
}

/**
 * Met à jour les fiches clients après création d'une carte cadeau :
 * — même personne (e-mails identiques ou un seul e-mail) : vente gift_card sur sa fiche ;
 * — acheteur ≠ bénéficiaire : vente gift_card consommable **uniquement** sur la fiche du bénéficiaire (pas d’entrée structurée chez l’acheteur) ;
 * — seul l’e-mail acheteur est renseigné : vente sur l’acheteur (pas de fiche bénéficiaire).
 */
async function appendGiftCardPurchaseToClientNotes(
  supabase: any,
  opts: {
    gift_card_id: string;
    buyer_email?: string;
    recipient_email?: string;
    buyer_name: string;
    recipient_name: string;
    purchase_date: string;
    valid_until: string;
    service_label: string;
    amount_eur?: number | null;
  }
): Promise<void> {
  const buyerEmail = (opts.buyer_email || '').trim().toLowerCase();
  const recipientEmail = (opts.recipient_email || '').trim().toLowerCase();

  const appendConsumableGiftCardSale = async (clientEmail: string, saleNotes: string): Promise<void> => {
    if (!clientEmail || !clientEmail.includes('@')) return;
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, notes')
      .eq('email', clientEmail)
      .maybeSingle();
    if (error || !client?.id) return;

    const existing = parseAdditionalSalesFromNotes(client.notes);
    const sale: AdditionalSaleRecord = {
      date: opts.purchase_date,
      type: 'gift_card',
      gift_card_id: opts.gift_card_id,
      notes: saleNotes
    };
    if (opts.amount_eur != null && opts.amount_eur > 0) {
      sale.giftCardAmount = opts.amount_eur;
    }
    const updatedSales = [...existing, sale];
    const newNotes = formatNotesWithAdditionalSales(client.notes, updatedSales);
    const { error: upErr } = await supabase.from('clients').update({ notes: newNotes }).eq('id', client.id);
    if (upErr) {
      console.error('[gift-cards] Ventes additionnelles (carte cadeau):', upErr.message);
    }
  };

  if (!buyerEmail && !recipientEmail) {
    return;
  }

  if (buyerEmail && recipientEmail && buyerEmail === recipientEmail) {
    await appendConsumableGiftCardSale(
      buyerEmail,
      `${opts.service_label} — bénéficiaire : ${opts.recipient_name}, valide jusqu'au ${opts.valid_until}`
    );
    return;
  }

  if (buyerEmail && recipientEmail && buyerEmail !== recipientEmail) {
    await appendConsumableGiftCardSale(
      recipientEmail,
      `${opts.service_label} — offert par ${opts.buyer_name}, valide jusqu'au ${opts.valid_until}`
    );
    return;
  }

  if (recipientEmail) {
    await appendConsumableGiftCardSale(
      recipientEmail,
      `${opts.service_label} — valide jusqu'au ${opts.valid_until}`
    );
    return;
  }

  await appendConsumableGiftCardSale(
    buyerEmail,
    `${opts.service_label} — bénéficiaire : ${opts.recipient_name}, valide jusqu'au ${opts.valid_until}`
  );
}

/**
 * Marque la vente carte cadeau existante comme utilisée (même ligne) + note bénéficiaire hors bloc si besoin.
 */
async function markGiftCardUsedInClientNotes(
  supabase: any,
  opts: {
    gift_card_id: string;
    buyer_email?: string | null;
    recipient_email?: string | null;
    buyer_name: string;
    recipient_name: string;
    purchase_date: string;
    service_label: string;
  }
): Promise<void> {
  const usageDate = new Date().toISOString().slice(0, 10);
  const gid = opts.gift_card_id;
  const be = (opts.buyer_email || '').trim().toLowerCase();
  const re = (opts.recipient_email || '').trim().toLowerCase();

  const tryMarkUsedOnClientEmail = async (email: string): Promise<boolean> => {
    if (!email || !email.includes('@')) return false;
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, notes')
      .eq('email', email)
      .maybeSingle();
    if (error || !client?.id) return false;

    let sales = parseAdditionalSalesFromNotes(client.notes);
    sales = sales.filter(
      (s) =>
        !(
          s.type === 'gift_card' &&
          !s.gift_card_id &&
          typeof s.notes === 'string' &&
          s.notes.includes('Carte cadeau utilisée —')
        )
    );
    let idx = sales.findIndex((s) => s.type === 'gift_card' && s.gift_card_id === gid);
    if (idx === -1) {
      idx = sales.findIndex(
        (s) =>
          s.type === 'gift_card' &&
          s.date === opts.purchase_date &&
          typeof s.notes === 'string' &&
          s.notes.includes(opts.service_label)
      );
    }
    if (idx === -1) return false;
    const next = [...sales];
    next[idx] = {
      ...next[idx],
      used_at: usageDate,
      gift_card_id: next[idx].gift_card_id || gid
    };
    const newNotes = formatNotesWithAdditionalSales(client.notes, next);
    await supabase.from('clients').update({ notes: newNotes }).eq('id', client.id);
    return true;
  };

  if (be && re && be !== re) {
    const okRecipient = await tryMarkUsedOnClientEmail(re);
    if (!okRecipient) {
      await tryMarkUsedOnClientEmail(be);
    }
    return;
  }

  await tryMarkUsedOnClientEmail(be || re);
}

async function handleGiftCards(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, POST, PATCH, DELETE, OPTIONS', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  const rateLimit = rateLimitMiddleware(req, 100, 60000);
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  if (!rateLimit.allowed) {
    const resetTimeStr = rateLimit.headers['X-RateLimit-Reset'];
    const retryAfter = Math.ceil((new Date(resetTimeStr as string).getTime() - Date.now()) / 1000);
    res.setHeader('Retry-After', Math.max(1, retryAfter).toString());
    return res.status(429).json({ error: 'Trop de requêtes', retryAfter: Math.max(1, retryAfter) });
  }

  const requireAdmin = async () => {
    const auth = await verifyAuth(req, supabase);
    if (!auth.authenticated || !auth.isAdmin) {
      return {
        ok: false as const,
        status: auth.authenticated ? 403 : 401,
        body: { error: auth.authenticated ? 'Forbidden: Admin access required' : 'Unauthorized' }
      };
    }
    return { ok: true as const };
  };

  if (req.method === 'GET') {
    const gate = await requireAdmin();
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .order('purchase_date', { ascending: false });
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la lecture des cartes cadeaux', details: error.message });
    }
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const gate = await requireAdmin();
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const body = req.body || {};
    const buyer_name = typeof body.buyer_name === 'string' ? body.buyer_name.trim() : '';
    const recipient_name = typeof body.recipient_name === 'string' ? body.recipient_name.trim() : '';
    const purchase_date = typeof body.purchase_date === 'string' ? body.purchase_date.trim() : '';
    const valid_until = typeof body.valid_until === 'string' ? body.valid_until.trim() : '';
    const service_label = typeof body.service_label === 'string' ? body.service_label.trim() : '';
    if (!buyer_name || !recipient_name || !purchase_date || !valid_until || !service_label) {
      return res.status(400).json({
        error: 'Champs requis: buyer_name, recipient_name, purchase_date, valid_until, service_label'
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchase_date) || !/^\d{4}-\d{2}-\d{2}$/.test(valid_until)) {
      return res.status(400).json({ error: 'Les dates doivent être au format YYYY-MM-DD' });
    }
    const buyer_email = typeof body.buyer_email === 'string' ? body.buyer_email.trim().toLowerCase() : '';
    const recipient_email = typeof body.recipient_email === 'string' ? body.recipient_email.trim().toLowerCase() : '';
    const row: any = {
      buyer_name,
      recipient_name,
      purchase_date,
      valid_until,
      service_label,
      used: !!body.used,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      buyer_email: buyer_email || null,
      recipient_email: recipient_email || null
    };
    const { data, error } = await supabase.from('gift_cards').insert([row]).select('*').single();
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la création', details: error.message });
    }
    const amount_eur = parseGiftCardAmountEur(body as Record<string, unknown>);
    if (buyer_email || recipient_email) {
      try {
        await appendGiftCardPurchaseToClientNotes(supabase, {
          gift_card_id: data.id,
          buyer_email,
          recipient_email,
          buyer_name,
          recipient_name,
          purchase_date,
          valid_until,
          service_label,
          amount_eur
        });
      } catch (e: any) {
        console.error('[gift-cards] Notes client:', e?.message || e);
      }
    }

    return res.status(201).json(data);
  }

  if (req.method === 'PATCH') {
    const gate = await requireAdmin();
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id est requis' });
    }
    const { data: oldRow, error: fetchErr } = await supabase.from('gift_cards').select('*').eq('id', id).single();
    if (fetchErr || !oldRow) {
      return res.status(404).json({ error: 'Carte introuvable' });
    }

    const body = req.body || {};
    const updateData: Record<string, unknown> = {};
    const strings = ['buyer_name', 'recipient_name', 'purchase_date', 'valid_until', 'service_label', 'notes'] as const;
    for (const key of strings) {
      if (body[key] !== undefined) {
        if (key === 'notes') {
          updateData[key] = body[key] === null || body[key] === '' ? null : String(body[key]).trim();
        } else if (key === 'purchase_date' || key === 'valid_until') {
          const d = String(body[key]).trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            return res.status(400).json({ error: `${key} doit être au format YYYY-MM-DD` });
          }
          updateData[key] = d;
        } else {
          updateData[key] = String(body[key]).trim();
        }
      }
    }
    if (body.buyer_email !== undefined) {
      updateData['buyer_email'] =
        typeof body.buyer_email === 'string' && body.buyer_email.trim()
          ? String(body.buyer_email).trim().toLowerCase()
          : null;
    }
    if (body.recipient_email !== undefined) {
      updateData['recipient_email'] =
        typeof body.recipient_email === 'string' && body.recipient_email.trim()
          ? String(body.recipient_email).trim().toLowerCase()
          : null;
    }
    if (body.used !== undefined) {
      updateData['used'] = !!body.used;
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }
    const { data, error } = await supabase
      .from('gift_cards')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour', details: error.message });
    }

    const wasUsed = !!oldRow.used;
    const becameUsed = updateData['used'] === true && !wasUsed;
    if (becameUsed && data) {
      try {
        await markGiftCardUsedInClientNotes(supabase, {
          gift_card_id: id,
          buyer_email: data.buyer_email ?? oldRow.buyer_email,
          recipient_email: data.recipient_email ?? oldRow.recipient_email,
          buyer_name: data.buyer_name,
          recipient_name: data.recipient_name,
          purchase_date: data.purchase_date,
          service_label: data.service_label
        });
      } catch (e: any) {
        console.error('[gift-cards] Vente utilisation:', e?.message || e);
      }
    }

    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const gate = await requireAdmin();
    if (!gate.ok) return res.status(gate.status).json(gate.body);
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id est requis' });
    }
    const { error } = await supabase.from('gift_cards').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la suppression', details: error.message });
    }
    return res.status(204).end();
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
  setCORSHeaders(res, req.headers.origin as string, 'GET, POST, PATCH, DELETE, OPTIONS', 'Content-Type, Authorization');
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
        name,
        duration
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
    // Vérifier si c'est une création admin (authentifié = pas de captcha requis)
    let isAdminCreation = false;
    if (req.headers.authorization) {
      const auth = await verifyAuth(req, supabase);
      if (auth.authenticated && auth.isAdmin) {
        isAdminCreation = true;
      }
    }

    const validation = validateAppointment(req.body, isAdminCreation);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Données invalides', details: validation.errors });
    }

    if (!isAdminCreation) {
      const captchaToken = req.body.captcha_token;
      if (!validateCaptchaToken(captchaToken)) {
        console.warn('[Appointments POST] ⚠️ Captcha invalide ou manquant');
        return res.status(400).json({ 
          error: 'Vérification anti-spam échouée', 
          details: ['Veuillez compléter la vérification anti-spam'] 
        });
      }
    }

    const sanitizedData = sanitizeAppointment(req.body);
    const { appointment_date, appointment_time, prestation_id } = sanitizedData;
    
    // Vérifier si la prestation nécessite l'âge de l'enfant (soins energetique maman bebe)
    if (prestation_id) {
      const { data: prestation, error: prestationError } = await supabase
        .from('prestations')
        .select('name')
        .eq('id', prestation_id)
        .single();
      
      if (!prestationError && prestation) {
        const prestationName = prestation.name.toLowerCase();
        const isMamanBebe = (prestationName.includes('maman') && prestationName.includes('bebe')) ||
                           (prestationName.includes('maman') && prestationName.includes('bébé')) ||
                           (prestationName.includes('mère') && prestationName.includes('bébé')) ||
                           (prestationName.includes('mere') && prestationName.includes('bebe'));
        
        if (isMamanBebe) {
          if (!sanitizedData.child_age || sanitizedData.child_age === null || sanitizedData.child_age === undefined) {
            return res.status(400).json({ 
              error: 'Données invalides', 
              details: ['L\'âge de l\'enfant est obligatoire pour cette prestation'] 
            });
          }
          // Vérifier que l'âge est dans la plage valide (0-24 mois)
          if (sanitizedData.child_age < 0 || sanitizedData.child_age > 24) {
            return res.status(400).json({ 
              error: 'Données invalides', 
              details: ['L\'âge de l\'enfant doit être entre 0 et 24 mois (2 ans)'] 
            });
          }
        }
      }
    }
    
    // Récupérer la durée de la prestation à réserver
    let newPrestationDuration = 90; // Durée par défaut
    if (prestation_id) {
      const { data: prestation } = await supabase
        .from('prestations')
        .select('duration')
        .eq('id', prestation_id)
        .single();
      
      if (prestation?.duration) {
        newPrestationDuration = parseDurationToMinutes(prestation.duration);
      }
    }

    // Récupérer les rendez-vous existants AVEC leur prestation et durée
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select(`
        appointment_time,
        prestation_id,
        prestations (
          duration
        )
      `)
      .eq('appointment_date', appointment_date)
      .in('status', ['pending', 'accepted']);

    if (checkError) {
      return res.status(500).json({ error: 'Erreur lors de la vérification des créneaux', details: checkError.message });
  }
  
    if (existingAppointments && existingAppointments.length > 0) {
      const [newHour, newMin] = appointment_time.split(':').map(Number);
      const newTime = newHour * 60 + newMin;
      const newEndTime = newTime + newPrestationDuration; // Utiliser la durée de la prestation à réserver
      
      for (const apt of existingAppointments) {
        const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number);
        const aptTime = aptHour * 60 + aptMin;
        
        // Récupérer la durée du rendez-vous existant
        const aptDuration = parseDurationToMinutes((apt as any).prestations?.duration);
        
        // Plage bloquée : calculée en fonction des durées réelles
        // - blockStart : le nouveau RDV ne doit pas commencer moins de sa propre durée avant le RDV existant
        // - blockEnd : le nouveau RDV ne doit pas commencer avant la fin du RDV existant
        const blockStart = Math.max(0, aptTime - newPrestationDuration);
        const blockEnd = aptTime + aptDuration;
        
        // Bloquer si :
        // 1. Le créneau commence dans la plage bloquée (inclus le début, exclu la fin)
        // 2. OU le créneau se termine après le début du RDV existant
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

    // Vérifier si le créneau est bloqué manuellement (indisponibilité)
    const timeForBlockCheck = appointment_time.length === 5 ? appointment_time + ':00' : appointment_time;
    const { data: blockedSlot } = await supabase
      .from('blocked_slots')
      .select('id')
      .eq('blocked_date', appointment_date)
      .eq('start_time', timeForBlockCheck)
      .maybeSingle();

    if (blockedSlot) {
      return res.status(409).json({
        error: 'Ce créneau n\'est pas disponible',
        message: 'Ce créneau a été bloqué par le praticien.'
      });
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([sanitizedData])
      .select(`
        id,
        client_name,
        client_email,
        client_phone,
        prestation_id,
        appointment_date,
        appointment_time,
        status,
        payment_method,
        notes,
        referral_source,
        referral_friend_name,
        child_age,
        created_at,
        updated_at,
        prestations (
          name
        )
      `)
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la création du rendez-vous', details: error.message });
    }

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

    // ===== GESTION FIDÉLITÉ ET PARRAINAGES =====
    let loyaltyCount = 0;
    let referrerLoyaltyCount: number | undefined = undefined;
    
    // Récupérer le nombre de RDV terminés du client (pour la fidélité)
    // Seuls les RDV terminés comptent (hors tirages de cartes)
    try {
      // Créer une instance Supabase sans cache pour avoir les données les plus récentes
      const freshUrl = process.env['SUPABASE_URL']!;
      const freshKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
      const supabaseFresh = createClient(freshUrl, freshKey, {
        global: {
          fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' })
        }
      });
      
      const { data: clientAppointments } = await supabaseFresh
        .from('appointments')
        .select('id, prestation_id, prestations(name)')
        .eq('client_email', data.client_email.toLowerCase())
        .eq('status', 'completed');
      
      if (clientAppointments) {
        // Filtrer les tirages de cartes (ne comptent pas pour la fidélité)
        const eligibleAppointments = clientAppointments.filter((apt: any) => {
          const prestationName = apt.prestations?.name?.toLowerCase() || '';
          return !prestationName.includes('tirage') && !prestationName.includes('carte');
        });
        loyaltyCount = eligibleAppointments.length;
      }
    } catch (loyaltyError: any) {
      console.warn('[Fidélité] Erreur récupération fidélité:', loyaltyError.message);
    }
    
    // Gérer le parrainage : si quelqu'un vient de la part d'un client, +1 au parrain
    if (data.referral_source === 'friend' && data.referral_friend_name) {
      try {
        console.log(`[Parrainage] Recherche du parrain: "${data.referral_friend_name}"`);
        
        // Chercher le parrain par nom (recherche approximative)
        const referrerName = data.referral_friend_name.trim().toLowerCase();
        const { data: referrerClients } = await supabase
          .from('clients')
          .select('id, email, name, referrals_count')
          .ilike('name', `%${referrerName}%`);
        
        if (referrerClients && referrerClients.length > 0) {
          // Prendre le premier match
          const referrer = referrerClients[0];
          const newReferralsCount = (referrer.referrals_count || 0) + 1;
          
          // Mettre à jour le compteur de parrainages du parrain
          await supabase
            .from('clients')
            .update({ referrals_count: newReferralsCount })
            .eq('id', referrer.id);
          
          // Compter les RDV du parrain pour sa fidélité
          const { data: referrerAppointments } = await supabase
            .from('appointments')
            .select('id, prestations(name)')
            .eq('client_email', referrer.email.toLowerCase())
            .eq('status', 'accepted');
          
          if (referrerAppointments) {
            const eligibleReferrerApts = referrerAppointments.filter((apt: any) => {
              const prestationName = apt.prestations?.name?.toLowerCase() || '';
              return !prestationName.includes('tirage') && !prestationName.includes('carte');
            });
            // +1 pour le bonus parrainage
            referrerLoyaltyCount = eligibleReferrerApts.length + newReferralsCount;
          }
          
          console.log(`[Parrainage] ✅ ${referrer.name} a maintenant ${newReferralsCount} parrainage(s)`);
        } else {
          console.log(`[Parrainage] ⚠️ Parrain "${data.referral_friend_name}" non trouvé dans la base clients`);
        }
      } catch (referralError: any) {
        console.warn('[Parrainage] Erreur gestion parrainage:', referralError.message);
      }
    }

    // Envoyer les emails (BLOQUANT - on attend avant de répondre)
    try {
      const { 
        sendAppointmentRequestConfirmation, 
        sendNewAppointmentNotificationToAdmin 
      } = await import('../lib/vercel-api-utils/email.js');
      
      const appointmentData = {
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone || undefined,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        prestation_name: data.prestations?.name || undefined,
        notes: data.notes || undefined,
        // Infos fidélité pour l'email admin
        loyalty_count: loyaltyCount,
        loyalty_threshold: 10, // Seuil de 10 séances
        // Infos parrainage
        referral_source: data.referral_source || undefined,
        referral_friend_name: data.referral_friend_name || undefined,
        referrer_loyalty_count: referrerLoyaltyCount,
      };
      
      console.log('[Email] 📧 Envoi des emails pour le nouveau RDV...');
      
      // Envoyer en parallèle ET ATTENDRE les résultats
      const results = await Promise.allSettled([
        sendAppointmentRequestConfirmation(appointmentData),
        sendNewAppointmentNotificationToAdmin(appointmentData)
      ]);
      
      const emailTypes = ['client (confirmation)', 'admin (notification)'];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value) {
            console.log(`[Email] ✅ Email ${emailTypes[index]}: envoyé avec succès`);
          } else {
            console.warn(`[Email] ⚠️ Email ${emailTypes[index]}: échec (voir logs Resend)`);
          }
        } else {
          console.error(`[Email] ❌ Email ${emailTypes[index]} erreur:`, result.reason);
        }
      });
      
    } catch (emailError: any) {
      console.error('[Appointments POST] ❌ Erreur import email (non bloquant):', emailError.message);
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
      const validStatuses = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];
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
      const validPaymentMethods = ['espèces', 'carte', 'virement', 'chèque', 'carte_cadeau', 'mixte', null];
      if (req.body.payment_method !== null && !validPaymentMethods.includes(req.body.payment_method)) {
        return res.status(400).json({ 
          error: `Invalid payment_method. Must be one of: ${validPaymentMethods.filter(m => m !== null).join(', ')}, or null` 
        });
      }
      updateData.payment_method = req.body.payment_method;
    }

    if (req.body.mixte_complement_payment_method !== undefined) {
      const validMixteComp = ['espèces', 'carte', 'virement', 'chèque', null];
      if (
        req.body.mixte_complement_payment_method !== null &&
        !validMixteComp.includes(req.body.mixte_complement_payment_method)
      ) {
        return res.status(400).json({
          error: `Invalid mixte_complement_payment_method. Must be one of: ${validMixteComp.filter((m) => m !== null).join(', ')}, or null`
        });
      }
      updateData.mixte_complement_payment_method = req.body.mixte_complement_payment_method;
    }

    if (req.body.session_amount_eur !== undefined) {
      const v = req.body.session_amount_eur;
      if (v === null) {
        updateData.session_amount_eur = null;
      } else {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        if (!Number.isFinite(n) || n < 0 || n > 10000) {
          return res.status(400).json({
            error: 'Invalid session_amount_eur. Expect null or a number between 0 and 10000.',
          });
        }
        updateData.session_amount_eur = Math.round(n * 100) / 100;
      }
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

    // Envoyer l'email de notification si le statut a changé (BLOQUANT)
    if (updateData.status && (updateData.status === 'accepted' || updateData.status === 'rejected')) {
      try {
        const { sendAppointmentStatusUpdate } = await import('../lib/vercel-api-utils/email.js');
        
        const appointmentData = {
          client_name: data.client_name,
          client_email: data.client_email,
          client_phone: data.client_phone || undefined,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          prestation_name: data.prestations?.name || undefined,
          notes: data.notes || undefined,
        };
        
        console.log(`[Email] 📧 Envoi email de ${updateData.status === 'accepted' ? 'confirmation' : 'refus'}...`);
        
        // Envoyer l'email ET ATTENDRE le résultat
        const emailSent = await sendAppointmentStatusUpdate(appointmentData, updateData.status);
        
        if (emailSent) {
          console.log(`[Email] ✅ Email de ${updateData.status === 'accepted' ? 'confirmation' : 'refus'} envoyé à ${data.client_email}`);
        } else {
          console.warn(`[Email] ⚠️ Email de ${updateData.status === 'accepted' ? 'confirmation' : 'refus'} non envoyé (voir logs Resend)`);
        }
        
      } catch (emailError: any) {
        console.error('[Appointments PATCH] Erreur envoi email:', emailError.message);
      }
    }

    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const auth = await verifyAuth(req, supabase);
    if (!auth.authenticated || !auth.isAdmin) {
      return res.status(auth.authenticated ? 403 : 401).json({
        error: auth.authenticated ? 'Forbidden: Admin access required' : 'Unauthorized'
      });
    }
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id est requis' });
    }
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la suppression du rendez-vous', details: error.message });
    }
    return res.status(204).end();
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleClients(req: VercelRequest, res: VercelResponse, supabase: any) {
  setCORSHeaders(res, req.headers.origin as string, 'GET, POST, PATCH, DELETE, OPTIONS', 'Content-Type, Authorization');
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

    // Liste complète de tous les clients (sans filtre)
    if (!email && !id && !clientId) {
      const { data: allClients, error: listError } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (listError) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des clients', details: listError.message });
      }
      return res.json(allClients || []);
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

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'id est requis' });
    }
    const { data: clientRow, error: fetchError } = await supabase
      .from('clients')
      .select('email, name, phone')
      .eq('id', id)
      .single();
    if (fetchError || !clientRow) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    const normalizedEmail = (clientRow.email || '').trim().toLowerCase();
    if (normalizedEmail) {
      const { error: delAptError } = await supabase
        .from('appointments')
        .delete()
        .eq('client_email', normalizedEmail);
      if (delAptError) {
        return res.status(500).json({
          error: 'Erreur lors de la suppression des rendez-vous associés',
          details: delAptError.message
        });
      }
    } else {
      const name = (clientRow.name || '').trim();
      const phone = (clientRow.phone || '').trim();
      if (phone) {
        const { error: delAptError } = await supabase
          .from('appointments')
          .delete()
          .eq('client_name', name)
          .eq('client_phone', phone);
        if (delAptError) {
          return res.status(500).json({
            error: 'Erreur lors de la suppression des rendez-vous associés',
            details: delAptError.message
          });
        }
      } else {
        const { error: e1 } = await supabase
          .from('appointments')
          .delete()
          .eq('client_name', name)
          .is('client_email', null);
        if (e1) {
          return res.status(500).json({
            error: 'Erreur lors de la suppression des rendez-vous associés',
            details: e1.message
          });
        }
        const { error: e2 } = await supabase
          .from('appointments')
          .delete()
          .eq('client_name', name)
          .eq('client_email', '');
        if (e2) {
          return res.status(500).json({
            error: 'Erreur lors de la suppression des rendez-vous associés',
            details: e2.message
          });
        }
      }
    }
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la suppression du client', details: error.message });
    }
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}

// ==================== HANDLER CONTACT ====================

/**
 * Handler pour le formulaire de contact
 * Envoie un email à l'admin avec le message du visiteur
 */
async function handleContact(req: VercelRequest, res: VercelResponse) {
  setCORSHeaders(res, req.headers.origin as string, 'POST, OPTIONS', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Rate limiting strict pour éviter les abus (5 messages par minute max)
  const rateLimit = rateLimitMiddleware(req, 5, 60000);
  
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
      message: 'Vous avez envoyé trop de messages. Veuillez patienter quelques minutes.',
      retryAfter: Math.max(1, retryAfter)
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  
  const { name, email, phone, subject, message, captcha_token } = req.body;
  
  // Validation des champs obligatoires
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Le nom est requis (minimum 2 caractères)');
  }
  
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Une adresse email valide est requise');
  }
  
  if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
    errors.push('Le sujet est requis (minimum 3 caractères)');
  }
  
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    errors.push('Le message est requis (minimum 10 caractères)');
  }
  
  // Validation du captcha
  if (!captcha_token || typeof captcha_token !== 'string') {
    errors.push('Le captcha est requis');
  } else {
    try {
      // Décoder le token base64
      const decoded = Buffer.from(captcha_token, 'base64').toString('utf-8');
      const tokenParts = decoded.split(':');
      if (tokenParts.length < 2) {
        errors.push('Format de captcha invalide');
      } else {
        const timestamp = parseInt(tokenParts[0], 10);
        const now = Date.now();
        // Token valide pour 10 minutes
        if (isNaN(timestamp) || (now - timestamp) > 10 * 60 * 1000) {
          errors.push('Captcha expiré, veuillez le résoudre à nouveau');
        }
      }
    } catch (e) {
      errors.push('Erreur de validation du captcha');
    }
  }
  
  // Vérification anti-spam basique (longueur max)
  if (name && name.length > 100) {
    errors.push('Le nom est trop long (max 100 caractères)');
  }
  if (subject && subject.length > 200) {
    errors.push('Le sujet est trop long (max 200 caractères)');
  }
  if (message && message.length > 5000) {
    errors.push('Le message est trop long (max 5000 caractères)');
  }
  if (phone && phone.length > 20) {
    errors.push('Le téléphone est trop long (max 20 caractères)');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation échouée', 
      details: errors 
    });
  }
  
  // Envoyer l'email
  try {
    const { sendContactMessage } = await import('../lib/vercel-api-utils/email.js');
    
    const result = await sendContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || undefined,
      subject: subject.trim(),
      message: message.trim()
    });
    
    if (result) {
      console.log(`[Contact] ✅ Message envoyé de: ${email}`);
      return res.status(200).json({ 
        success: true, 
        message: 'Votre message a bien été envoyé. Je vous répondrai dans les plus brefs délais.' 
      });
    } else {
      console.error(`[Contact] ❌ Échec de l'envoi du message de: ${email}`);
      return res.status(500).json({ 
        error: 'Erreur lors de l\'envoi', 
        message: 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.' 
      });
    }
  } catch (error: any) {
    console.error('[Contact] Erreur:', error.message);
    return res.status(500).json({ 
      error: 'Erreur serveur', 
      message: 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.' 
    });
  }
}
