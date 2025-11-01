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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
      const { data, error } = await supabase
        .from('opening_hours')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
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

        let query = supabase
          .from('appointments')
          .select('*, prestations(name)');

        if (status) {
          query = query.eq('status', status);
        }

        if (startDate) {
          query = query.gte('appointment_date', startDate);
        }

        if (endDate) {
          query = query.lte('appointment_date', endDate);
        }

        query = query.order('appointment_date', { ascending: true })
                     .order('appointment_time', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      // POST : Créer un rendez-vous
      else if (req.method === 'POST') {
        const body = await readBody(req);
        const { appointment_date, appointment_time } = body;

        // Vérifier qu'il n'y a pas déjà un RDV à cette date/heure
        const { data: existingAppointments, error: checkError } = await supabase
          .from('appointments')
          .select('id')
          .eq('appointment_date', appointment_date)
          .eq('appointment_time', appointment_time)
          .in('status', ['pending', 'accepted']);

        if (checkError) {
          throw checkError;
        }

        if (existingAppointments && existingAppointments.length > 0) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Ce créneau est déjà réservé' }));
          return;
        }

        const { data, error } = await supabase
          .from('appointments')
          .insert([body])
          .select('*, prestations(name)')
          .single();

        if (error) throw error;
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      // PATCH : Mettre à jour un rendez-vous (accepter/refuser)
      else if (req.method === 'PATCH') {
        const { id } = parsedUrl.query;
        
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing appointment ID' }));
          return;
        }

        const body = await readBody(req);

        const { data, error } = await supabase
          .from('appointments')
          .update(body)
          .eq('id', id)
          .select('*, prestations(name)')
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
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
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
  console.log(`   - http://localhost:${PORT}/api/opening-hours`);
  console.log(`   - http://localhost:${PORT}/api/available-slots (GET)`);
  console.log(`   - http://localhost:${PORT}/api/blocked-dates (GET)`);
  console.log(`   - http://localhost:${PORT}/api/appointments (GET, POST, PATCH)`);
});