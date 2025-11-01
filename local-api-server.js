// Serveur API local simple pour tester sans Vercel CLI
// Usage: npm run api:dev

// Pour charger dotenv si installé
let dotenv;
try {
  dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
} catch (e) {
  console.log('dotenv non installé, utilisation des variables d\'environnement système');
}

const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const url = require('url');
const { setSecurityHeaders } = require('./local-api-server-utils');
const { validateAppointment, sanitizeAppointment } = require('./local-api-server-validation');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Client Supabase pour vérifier l'authentification utilisateur (avec anon key si disponible)
let supabaseAuth;
try {
  if (process.env.SUPABASE_ANON_KEY) {
    supabaseAuth = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  } else {
    // Si pas d'anon key, utiliser le service role (moins sécurisé mais fonctionne)
    supabaseAuth = supabase;
    console.warn('⚠️ SUPABASE_ANON_KEY non défini, utilisation de SERVICE_ROLE_KEY pour l\'auth (non recommandé)');
  }
} catch (e) {
  supabaseAuth = supabase;
  console.warn('⚠️ Erreur lors de la création du client auth, utilisation du client service role');
}

const PORT = 3000;

// Fonction utilitaire pour lire le body de la requête
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Headers de sécurité (CORS, XSS, etc.)
  const origin = req.headers.origin;
  setSecurityHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  try {
    // Routes existantes
    if (pathname === '/api/prestations') {
      const { data, error } = await supabase
        .from('prestations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }
    else if (pathname === '/api/creations') {
      const { data, error } = await supabase
        .from('creations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }
    else if (pathname === '/api/testimonials') {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }
    else if (pathname === '/api/faqs') {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }
    else if (pathname === '/api/about') {
      const { data, error } = await supabase
        .from('about_content')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }
    else if (pathname === '/api/opening-hours') {
      // GET : Récupérer les horaires
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('opening_hours')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      // PATCH : Mettre à jour les horaires - PROTÉGÉ
      else if (req.method === 'PATCH') {
        const { id } = parsedUrl.query;
        
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing opening hours ID' }));
          return;
        }

        // Vérifier l'authentification
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        
        if (authError || !user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid token' }));
          return;
        }

        const body = await readBody(req);

        const { data, error } = await supabase
          .from('opening_hours')
          .update(body)
          .eq('id', id)
          .select('*')
          .single();

        if (error) throw error;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    }
    // NOUVELLE ROUTE : Créneaux disponibles
    else if (pathname === '/api/available-slots') {
      if (req.method === 'GET') {
        const { day_of_week } = parsedUrl.query;
        
        let query = supabase
          .from('available_slots')
          .select('*')
          .eq('is_active', true);

        if (day_of_week !== undefined) {
          query = query.eq('day_of_week', parseInt(day_of_week));
        }

        query = query.order('day_of_week', { ascending: true })
                     .order('start_time', { ascending: true });

        const { data, error } = await query;
        
        if (error) throw error;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    }
    // NOUVELLE ROUTE : Dates bloquées
    else if (pathname === '/api/blocked-dates') {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('blocked_dates')
          .select('*')
          .gte('blocked_date', new Date().toISOString().split('T')[0])
          .order('blocked_date', { ascending: true });
        
        if (error) throw error;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    }
    // NOUVELLE ROUTE : Rendez-vous
    else if (pathname === '/api/appointments') {
      // GET : Récupérer les rendez-vous
      if (req.method === 'GET') {
        const { status, startDate, endDate } = parsedUrl.query;

        // Valider les paramètres de requête
        if (status && typeof status !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid status parameter' }));
          return;
        }
        
        const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid status value' }));
          return;
        }

        // Valider les formats de date
        if (startDate && typeof startDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid startDate format (YYYY-MM-DD expected)' }));
          return;
        }

        if (endDate && typeof endDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid endDate format (YYYY-MM-DD expected)' }));
          return;
        }

        // Essayer avec la relation complète
        let query = supabase
          .from('appointments')
          .select(`
            *,
            prestations (
              name
            )
          `);

        if (status && typeof status === 'string') {
          query = query.eq('status', status);
        }

        if (startDate && typeof startDate === 'string') {
          query = query.gte('appointment_date', startDate);
        }

        if (endDate && typeof endDate === 'string') {
          query = query.lte('appointment_date', endDate);
        }

        query = query.order('appointment_date', { ascending: true })
                     .order('appointment_time', { ascending: true });

        const { data, error } = await query;

        if (error) {
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de la récupération des rendez-vous',
            ...(isDevelopment && { details: error.message })
          }));
          return;
        }
        
        // Ne pas logger les données sensibles en production
        const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
        if (isDevelopment && data && data.length > 0) {
          console.log('Sample appointment data:', JSON.stringify(data[0], null, 2));
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      // POST : Créer un rendez-vous
      else if (req.method === 'POST') {
        const body = await readBody(req);

        // Valider les données d'entrée
        const validation = validateAppointment(body);
        if (!validation.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Données invalides',
            details: validation.errors
          }));
          return;
        }

        // Nettoyer et normaliser les données
        const sanitizedData = sanitizeAppointment(body);
        const { appointment_date, appointment_time } = sanitizedData;

        // Vérifier qu'il n'y a pas déjà un RDV à cette date/heure
        const { data: existingAppointments, error: checkError } = await supabase
          .from('appointments')
          .select('id')
          .eq('appointment_date', appointment_date)
          .eq('appointment_time', appointment_time)
          .in('status', ['pending', 'accepted']);

        if (checkError) {
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de la vérification des créneaux',
            ...(isDevelopment && { details: checkError.message })
          }));
          return;
        }

        if (existingAppointments && existingAppointments.length > 0) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Ce créneau est déjà réservé' }));
          return;
        }

        // Insérer uniquement les champs autorisés et validés
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
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de la création du rendez-vous',
            ...(isDevelopment && { details: error.message })
          }));
          return;
        }
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      // PATCH : Mettre à jour un rendez-vous (accepter/refuser) - PROTÉGÉ
      else if (req.method === 'PATCH') {
        const { id } = parsedUrl.query;
        
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing appointment ID' }));
          return;
        }

        console.log('📝 PATCH request for appointment:', id);

        // Vérifier l'authentification
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          console.log('❌ No auth header');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const token = authHeader.substring(7);
        
        if (!token || token.length === 0) {
          console.log('❌ Empty token');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Empty token' }));
          return;
        }
        
        console.log('🔐 Verifying token, length:', token.length);
        
        let user, authError;
        try {
          const result = await supabaseAuth.auth.getUser(token);
          user = result.data?.user;
          authError = result.error;
        } catch (err) {
          console.error('❌ Error verifying token:', err);
          authError = err;
        }
        
        if (authError || !user) {
          console.error('❌ Auth failed:', authError?.message || 'No user');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.end(JSON.stringify({ 
            error: 'Invalid token',
            ...(isDevelopment && { details: authError?.message || 'Authentication failed' })
          }));
          return;
        }
        
        // Vérifier si l'utilisateur est admin
        let isAdmin = false;
        try {
          const { data: adminUser, error: adminError } = await supabase
            .from('admin')
            .select('id')
            .eq('id', user.id)
            .single();

          // Si la table admin n'existe pas, considérer l'utilisateur authentifié comme admin (fallback)
          if (adminError && (adminError.code === 'PGRST116' || adminError.message?.includes('does not exist'))) {
            console.warn('⚠️ Table admin n\'existe pas, utilisateur authentifié considéré comme admin');
            isAdmin = true;
          } else {
            isAdmin = !!adminUser && !adminError;
          }
        } catch (adminCheckError) {
          // Erreur lors de la vérification admin - refuser l'accès par sécurité
          console.error('❌ Erreur vérification admin:', adminCheckError);
          isAdmin = false;
        }

        if (!isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
          return;
        }
        
        const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
        if (isDevelopment) {
          console.log('✅ Auth successful for user:', user.email);
        }

        const body = await readBody(req);
        if (isDevelopment) {
          console.log('📦 Request body:', JSON.stringify(body));
        }

        // Nettoyer le body pour ne garder que les champs autorisés
        const updateData = {
          status: body.status, // Le statut doit être en minuscules
          ...(body.notes !== undefined && { notes: body.notes })
        };

        // Vérifier que le statut est valide
        const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
        if (!updateData.status || !validStatuses.includes(updateData.status.toLowerCase())) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }));
          return;
        }

        // S'assurer que le statut est en minuscules
        updateData.status = updateData.status.toLowerCase().trim();

        console.log('Updating appointment:', id, 'with data:', updateData);
        console.log('Status value:', updateData.status, 'Type:', typeof updateData.status);

        // Vérifier à nouveau juste avant l'update
        if (!validStatuses.includes(updateData.status)) {
          console.error('❌ Status validation failed before update:', updateData.status);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: `Invalid status value: "${updateData.status}". Must be one of: ${validStatuses.join(', ')}` 
          }));
          return;
        }

        // Nettoyer complètement l'objet - ne garder QUE status et notes si défini
        const cleanUpdateData = {
          status: updateData.status
        };
        if (updateData.notes !== undefined && updateData.notes !== null) {
          cleanUpdateData.notes = updateData.notes;
        }

        if (isDevelopment) {
          console.log('Clean update data:', JSON.stringify(cleanUpdateData));
        }

        const { data, error } = await supabase
          .from('appointments')
          .update(cleanUpdateData)
          .eq('id', id)
          .select(`
            *,
            prestations (
              name
            )
          `)
          .single();

        if (error) {
          console.error('Supabase update error:', error);
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          if (isDevelopment) {
            console.error('Error details:', JSON.stringify(error, null, 2));
          }
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de la mise à jour',
            ...(isDevelopment && { details: error.message })
          }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    }
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   - http://localhost:${PORT}/api/prestations`);
  console.log(`   - http://localhost:${PORT}/api/creations`);
  console.log(`   - http://localhost:${PORT}/api/testimonials`);
  console.log(`   - http://localhost:${PORT}/api/faqs`);
  console.log(`   - http://localhost:${PORT}/api/about`);
      console.log(`   - http://localhost:${PORT}/api/opening-hours (GET, PATCH)`);
  console.log(`   - http://localhost:${PORT}/api/available-slots (GET)`);
  console.log(`   - http://localhost:${PORT}/api/blocked-dates (GET)`);
  console.log(`   - http://localhost:${PORT}/api/appointments (GET, POST, PATCH)`);
});