// Serveur API local simple pour tester sans Vercel CLI
// Usage: npm run api:dev

const fs = require('fs');
const path = require('path');

// Charger dotenv si installé
let dotenv;
let envFileLoaded = false;
try {
  dotenv = require('dotenv');
  // Essayer de charger .env.local d'abord, puis .env
  const envLocalPath = path.join(__dirname, '.env.local');
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envLocalPath)) {
    const result = dotenv.config({ path: envLocalPath });
    if (!result.error) {
      envFileLoaded = true;
      console.log('✅ Variables chargées depuis .env.local');
      // Debug: afficher les clés trouvées (sans les valeurs)
      if (result.parsed) {
        const keys = Object.keys(result.parsed);
        console.log(`   ${keys.length} variable(s) chargée(s): ${keys.join(', ')}`);
      }
    } else {
      console.error('❌ Erreur lors du chargement de .env.local:', result.error.message);
    }
  } else if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envFileLoaded = true;
      console.log('✅ Variables chargées depuis .env');
    } else {
      console.error('❌ Erreur lors du chargement de .env:', result.error.message);
    }
  } else {
    console.log('ℹ️  Aucun fichier .env ou .env.local trouvé');
    console.log('   💡 Créez un fichier .env.local (voir .env.example pour le format)');
  }
} catch (e) {
  console.log('⚠️  dotenv non installé, utilisation des variables d\'environnement système');
}

// Vérifier que les variables requises sont définies
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Debug: afficher quelles variables sont chargées (sans afficher les valeurs complètes)
console.log('\n🔍 Vérification des variables d\'environnement:');
console.log('  SUPABASE_URL:', SUPABASE_URL ? `✅ (${SUPABASE_URL.substring(0, 30)}...)` : '❌ MANQUANT');
console.log('  SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? `✅ (présent, ${SUPABASE_ANON_KEY.length} caractères)` : '❌ MANQUANT');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? `✅ (présent, ${SUPABASE_SERVICE_ROLE_KEY.length} caractères)` : '❌ MANQUANT');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ ERREUR: Variables d\'environnement Supabase manquantes!\n');
  
  if (!SUPABASE_URL) {
    console.error('❌ SUPABASE_URL est manquant');
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY est manquant');
    console.error('   ⚠️  Cette clé est DIFFÉRENTE de SUPABASE_ANON_KEY !');
    console.error('   ⚠️  C\'est la clé "service_role" (secrète) nécessaire pour l\'API serveur.\n');
  }
  
  console.error('\n📝 Le serveur API local nécessite les variables suivantes dans .env.local :\n');
  console.error('   SUPABASE_URL=https://votre-projet.supabase.co');
  console.error('   SUPABASE_ANON_KEY=eyJhbGci... (votre anon key existante)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (⚠️ DIFFÉRENTE de l\'anon key !)\n');
  console.error('📖 Instructions détaillées :');
  console.error('   1. Ouvrez votre fichier .env.local');
  console.error('   2. Ajoutez la ligne suivante (si elle n\'existe pas) :');
  console.error('      SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici\n');
  console.error('🔑 Pour récupérer SUPABASE_SERVICE_ROLE_KEY :');
  console.error('   1. https://supabase.com/dashboard > Votre projet');
  console.error('   2. Settings > API');
  console.error('   3. Section "Project API keys"');
  console.error('   4. Cliquez sur "Reveal" pour "service_role" (pas "anon" !)');
  console.error('   5. Copiez la clé complète (très longue)\n');
  console.error('💡 Voir ENV_SETUP.md pour plus de détails\n');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const url = require('url');
const { setSecurityHeaders } = require('./local-api-server-utils.cjs');
const { validateAppointment, sanitizeAppointment } = require('./local-api-server-validation.cjs');
const { applyRateLimit } = require('./local-api-server-rate-limiter.cjs');

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log('✅ Client Supabase créé avec succès');
} catch (error) {
  console.error('❌ Erreur lors de la création du client Supabase:', error.message);
  process.exit(1);
}

// Client Supabase pour vérifier l'authentification utilisateur (avec anon key si disponible)
let supabaseAuth;
try {
  if (SUPABASE_ANON_KEY) {
    supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Client Supabase Auth créé avec ANON_KEY');
  } else {
    // Si pas d'anon key, utiliser le service role (moins sécurisé mais fonctionne)
    supabaseAuth = supabase;
    console.warn('⚠️  SUPABASE_ANON_KEY non défini, utilisation de SERVICE_ROLE_KEY pour l\'auth (non recommandé)');
  }
} catch (e) {
  supabaseAuth = supabase;
  console.warn('⚠️  Erreur lors de la création du client auth, utilisation du client service role');
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

// Fonction utilitaire pour vérifier l'authentification
async function verifyAuth(req, supabaseAuth) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No auth header');
    return { authenticated: false, error: 'Unauthorized', message: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7);
  if (!token || token.length === 0) {
    console.log('❌ Empty token');
    return { authenticated: false, error: 'Empty token', message: 'Token is empty' };
  }

  console.log('🔐 Verifying token, length:', token.length);

  try {
    const result = await supabaseAuth.auth.getUser(token);
    if (result.error || !result.data?.user) {
      console.error('❌ Auth failed:', result.error?.message || 'No user');
      return { authenticated: false, error: 'Invalid token', message: result.error?.message || 'Authentication failed' };
    }
    return { authenticated: true, user: result.data.user };
  } catch (err) {
    console.error('❌ Error verifying token:', err);
    return { authenticated: false, error: 'Invalid token', message: err.message || 'Authentication failed' };
  }
}

// Fonction utilitaire pour vérifier si un utilisateur est admin
async function verifyAdmin(user, supabase) {
  console.log(`🔍 Vérification admin pour: ${user.email} (${user.id})`);
  
  try {
    const { data: adminUser, error: adminError } = await supabase
      .from('admin')
      .select('id')
      .eq('id', user.id)
      .single();

    console.log('📊 Résultat vérification admin:', {
      found: !!adminUser,
      errorCode: adminError?.code,
      errorMessage: adminError?.message
    });

    // Si l'utilisateur est dans la table admin, il est admin
    if (adminUser && !adminError) {
      console.log('✅ Utilisateur est admin (trouvé dans la table)');
      return { isAdmin: true };
    }

    // Si la table admin n'existe pas (erreur de table), considérer l'utilisateur comme admin
    if (adminError && adminError.message?.includes('does not exist')) {
      console.warn('⚠️ Table admin n\'existe pas, utilisateur authentifié considéré comme admin');
      return { isAdmin: true };
    }

    // Si l'utilisateur n'est pas dans la table (PGRST116 = no rows returned)
    if (adminError && adminError.code === 'PGRST116') {
      console.log('🔍 Utilisateur non trouvé dans admin, vérification si table est vide...');
      
      // Vérifier si la table admin est vide (aucun admin existant)
      const { count, error: countError } = await supabase
        .from('admin')
        .select('*', { count: 'exact', head: true });

      console.log('📊 Nombre d\'admins dans la table:', count, 'Erreur:', countError?.message);

      // Si la table est vide ou inaccessible, créer automatiquement cet utilisateur comme admin
      if (countError || count === 0 || count === null) {
        console.log('✨ Table admin vide, ajout automatique de l\'utilisateur comme admin...');
        try {
          // Insérer l'utilisateur dans la table admin
          const { error: insertError } = await supabase
            .from('admin')
            .insert([{ id: user.id, email: user.email || '' }]);

          if (!insertError) {
            console.log(`✅ Utilisateur ${user.email} ajouté automatiquement comme admin (premier utilisateur)`);
            return { isAdmin: true };
          } else {
            console.warn('⚠️ Impossible d\'ajouter l\'utilisateur comme admin:', insertError.message);
            console.warn('   Code erreur:', insertError.code);
            // Si l'insertion échoue mais que la table est vide, autoriser quand même (fallback)
            if (count === 0) {
              console.warn('⚠️ Table admin vide, autorisation de l\'utilisateur (fallback)');
              return { isAdmin: true };
            }
          }
        } catch (insertErr) {
          console.warn('⚠️ Erreur lors de l\'ajout automatique comme admin:', insertErr.message);
          // Si l'insertion échoue mais que la table est vide, autoriser quand même (fallback)
          if (count === 0) {
            console.warn('⚠️ Table admin vide, autorisation de l\'utilisateur (fallback)');
            return { isAdmin: true };
          }
        }
      } else {
        console.log(`ℹ️  Table admin contient ${count} admin(s), utilisateur non autorisé automatiquement`);
      }
    } else {
      console.warn('⚠️ Erreur inattendue lors de la vérification admin:', adminError);
    }

    return { isAdmin: false };
  } catch (adminCheckError) {
    // Erreur lors de la vérification admin
    console.error('❌ Erreur vérification admin:', adminCheckError);
    console.error('   Message:', adminCheckError.message);
    console.error('   Stack:', adminCheckError.stack);
    
    // Si c'est une erreur de table inexistante, autoriser l'utilisateur
    if (adminCheckError.message?.includes('does not exist')) {
      console.warn('⚠️ Table admin inaccessible, utilisateur authentifié considéré comme admin (fallback)');
      return { isAdmin: true };
    }
    
    return { isAdmin: false, error: adminCheckError.message };
  }
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

  // Rate limiting global seulement pour les routes publiques (GET sans auth)
  // Les routes protégées auront leur propre rate limiting plus permissif
  const isProtectedRoute = pathname.includes('/api/appointments') || 
                          pathname.includes('/api/clients') || 
                          pathname.includes('/api/opening-hours');
  
  // Pour les routes publiques (GET), appliquer un rate limiting plus souple
  if (req.method === 'GET' && !isProtectedRoute) {
    if (!applyRateLimit(req, res, 200, 60000)) { // 200 req/min pour les GET publics
      return;
    }
  }

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
        // Rate limiting pour GET : 200 par minute (plus permissif car peut être authentifié)
        if (!applyRateLimit(req, res, 200, 60000)) {
          return;
        }
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
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: auth.error,
            ...(isDevelopment && { details: auth.message })
          }));
          return;
        }

        // Vérifier les droits admin
        const adminCheck = await verifyAdmin(auth.user, supabase);
        if (!adminCheck.isAdmin) {
          console.error(`❌ Accès refusé: ${auth.user.email} (${auth.user.id}) n'est pas admin`);
          console.error('   💡 Solution: Ajoutez cet utilisateur dans la table admin avec:');
          console.error(`      INSERT INTO admin (id, email) VALUES ('${auth.user.id}', '${auth.user.email}');`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Forbidden: Admin access required',
            message: 'User is not an admin. Please contact an administrator to grant you access.',
            userId: auth.user.id,
            userEmail: auth.user.email
          }));
          return;
        }

        console.log(`✅ Utilisateur ${auth.user.email} autorisé comme admin`);

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
        // Rate limiting pour GET : 200 par minute (plus permissif car authentifié)
        if (!applyRateLimit(req, res, 200, 60000)) {
          return;
        }
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
        // Rate limiting spécifique pour création : 50 par minute (augmenté)
        if (!applyRateLimit(req, res, 50, 60000)) {
          return;
        }
        
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

        // Récupérer tous les rendez-vous pending ou accepted pour cette date
        const { data: existingAppointments, error: checkError } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('appointment_date', appointment_date)
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

        // Vérifier si le créneau demandé chevauche avec une plage bloquée de 1h30
        if (existingAppointments && existingAppointments.length > 0) {
          // Fonction pour formater les minutes en HH:MM
          function formatTimeMinutes(minutes) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          }

          const [newHour, newMin] = appointment_time.split(':').map(Number);
          const newTime = newHour * 60 + newMin; // Convertir en minutes depuis minuit
          
          for (const apt of existingAppointments) {
            const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number);
            const aptTime = aptHour * 60 + aptMin; // Convertir en minutes depuis minuit
            
            // Plage bloquée : de l'heure du rendez-vous jusqu'à 1h30 après (90 minutes)
            // Exemple: rendez-vous à 9h30 (570 min) → bloque de 570 à 660 minutes (11h00)
            const blockStart = aptTime;
            const blockEnd = aptTime + 90; // +1h30
            
            // Vérifier si le créneau demandé est dans cette plage bloquée
            if (newTime >= blockStart && newTime < blockEnd) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Ce créneau est déjà réservé',
                message: `Un rendez-vous existe à ${apt.appointment_time} et bloque les créneaux jusqu'à ${formatTimeMinutes(blockEnd)}`
              }));
              return;
            }
          }
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
        // Rate limiting spécifique pour mise à jour : 100 par minute (augmenté pour éviter les blocages)
        if (!applyRateLimit(req, res, 100, 60000)) {
          return;
        }
        
        const { id } = parsedUrl.query;
        
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing appointment ID' }));
          return;
        }

        console.log('📝 PATCH request for appointment:', id);

        // Vérifier l'authentification
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: auth.error,
            ...(isDevelopment && { details: auth.message })
          }));
          return;
        }

        // Vérifier les droits admin
        const adminCheck = await verifyAdmin(auth.user, supabase);
        console.log(`🎯 Résultat final - isAdmin: ${adminCheck.isAdmin}`);

        if (!adminCheck.isAdmin) {
          console.error(`❌ Accès refusé: ${auth.user.email} (${auth.user.id}) n'est pas admin`);
          console.error('   💡 Solution: Ajoutez cet utilisateur dans la table admin avec:');
          console.error(`      INSERT INTO admin (id, email) VALUES ('${auth.user.id}', '${auth.user.email}');`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Forbidden: Admin access required',
            message: 'User is not an admin. Please contact an administrator to grant you access.',
            userId: auth.user.id,
            userEmail: auth.user.email
          }));
          return;
        }

        console.log(`✅ Utilisateur ${auth.user.email} autorisé comme admin`);
        
        const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
        if (isDevelopment) {
          console.log('✅ Auth successful for user:', auth.user.email);
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
    // NOUVELLE ROUTE : Clients
    else if (pathname === '/api/clients') {
      // Vérifier l'authentification pour toutes les opérations
      const auth = await verifyAuth(req, supabaseAuth);
      if (!auth.authenticated) {
        const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: auth.error || 'Unauthorized',
          message: auth.message || 'Missing or invalid authorization header',
          ...(isDevelopment && { details: auth.message })
        }));
        return;
      }

      // Vérifier les droits admin
      const adminCheck = await verifyAdmin(auth.user, supabase);
      if (!adminCheck.isAdmin) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Forbidden: Admin access required',
          message: 'User is not an admin. Please contact an administrator to grant you access.'
        }));
        return;
      }

      // GET - Récupérer un client par email
      if (req.method === 'GET') {
        // Rate limiting pour GET : 200 par minute (plus permissif car authentifié)
        if (!applyRateLimit(req, res, 200, 60000)) {
          return;
        }
        
        const { email } = parsedUrl.query;

        if (!email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Email requis' }));
          return;
        }

        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Client non trouvé' }));
            return;
          }
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de la récupération du client',
            ...(isDevelopment && { details: error.message })
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      // POST - Créer ou mettre à jour un client (upsert)
      else if (req.method === 'POST') {
        // Rate limiting spécifique pour création : 50 par minute (augmenté)
        if (!applyRateLimit(req, res, 50, 60000)) {
          return;
        }

        const clientData = await readBody(req);

        if (!clientData.email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Email requis' }));
          return;
        }

        // Normaliser l'email
        const email = clientData.email.toLowerCase().trim();

        // Préparer les données pour l'upsert
        const dataToUpsert = {
          email: email,
          name: clientData.name || null,
          phone: clientData.phone || null,
          birthdate: clientData.birthdate || null,
          notes: clientData.notes || null
        };

        // Utiliser upsert (INSERT ... ON CONFLICT DO UPDATE)
        const { data, error } = await supabase
          .from('clients')
          .upsert(dataToUpsert, {
            onConflict: 'email',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) {
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de la création/mise à jour du client',
            ...(isDevelopment && { details: error.message })
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      // PATCH - Mettre à jour un client
      else if (req.method === 'PATCH') {
        // Rate limiting spécifique pour mise à jour : 100 par minute (augmenté)
        if (!applyRateLimit(req, res, 100, 60000)) {
          return;
        }

        const { email } = parsedUrl.query;
        const updates = await readBody(req);

        if (!email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Email requis' }));
          return;
        }

        // Normaliser l'email
        const normalizedEmail = email.toLowerCase().trim();

        // Préparer les mises à jour (seulement les champs fournis)
        const dataToUpdate = {};
        if (updates.name !== undefined) dataToUpdate.name = updates.name;
        if (updates.phone !== undefined) dataToUpdate.phone = updates.phone || null;
        if (updates.birthdate !== undefined) dataToUpdate.birthdate = updates.birthdate || null;
        if (updates.notes !== undefined) dataToUpdate.notes = updates.notes || null;

        const { data, error } = await supabase
          .from('clients')
          .update(dataToUpdate)
          .eq('email', normalizedEmail)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Client non trouvé' }));
            return;
          }
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de la mise à jour du client',
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
  console.log(`   - http://localhost:${PORT}/api/clients (GET, POST, PATCH) - PROTÉGÉ`);
});