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
const { validateAppointment, validateAppointmentAdmin, sanitizeAppointment } = require('./local-api-server-validation.cjs');
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

// Fonction pour échapper le HTML (sécurité XSS)
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Fonction pour générer le HTML de l'email de contact
function generateContactEmailHtml(data) {
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safePhone = escapeHtml(data.phone);
  const safeSubject = escapeHtml(data.subject);
  const safeMessage = escapeHtml(data.message).replace(/\n/g, '<br>');
  const SITE_NAME = 'Reiki & Sens';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f1e8; font-family: Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(139, 122, 98, 0.15);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 30px; background: linear-gradient(135deg, #8b7a62 0%, #6f5f4e 100%); text-align: center;">
                  <h1 style="font-family: Georgia, serif; font-size: 22px; color: #ffffff; margin: 0; letter-spacing: 1px;">
                    ✉️ Nouveau message de contact
                  </h1>
                </td>
              </tr>
              
              <!-- Contenu -->
              <tr>
                <td style="padding: 30px;">
                  
                  <!-- Sujet -->
                  <div style="background: linear-gradient(135deg, #faf8f3 0%, #f5f1e8 100%); border-radius: 8px; padding: 20px; margin: 0 0 20px 0">
                    <h2 style="font-family: Georgia, serif; font-size: 18px; color: #4a3f35; margin: 0;">
                      ${safeSubject}
                    </h2>
                  </div>
                  
                  <!-- Infos expéditeur -->
                  <div style="background: #faf8f3; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                    <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: #8b7a62; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
                      👤 Expéditeur
                    </h3>
                    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #4a3f35; margin: 0 0 8px 0; font-weight: bold;">
                      ${safeName}
                    </p>
                    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e; margin: 0 0 5px 0;">
                      📧 <a href="mailto:${safeEmail}" style="color: #8b7a62; text-decoration: none;">${safeEmail}</a>
                    </p>
                    ${safePhone ? `
                    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #6f5f4e; margin: 0;">
                      📱 <a href="tel:${safePhone}" style="color: #8b7a62; text-decoration: none;">${safePhone}</a>
                    </p>
                    ` : ''}
                  </div>
                  
                  <!-- Message -->
                  <div style="background: #ffffff; border: 1px solid #ebe5d5; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                    <h3 style="font-family: Arial, sans-serif; font-size: 12px; color: #8b7a62; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">
                      💬 Message
                    </h3>
                    <p style="font-family: Arial, sans-serif; font-size: 15px; color: #4a3f35; margin: 0; line-height: 1.7;">
                      ${safeMessage}
                    </p>
                  </div>
                  
                  <!-- Bouton répondre -->
                  <div style="text-align: center; padding: 20px 0;">
                    <a href="mailto:${safeEmail}?subject=Re: ${encodeURIComponent(data.subject)}" 
                       style="display: inline-block; background: linear-gradient(135deg, #8b7a62 0%, #6f5f4e 100%); color: #ffffff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">
                      📧 Répondre à ${safeName}
                    </a>
                  </div>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px; background: #faf8f3; border-top: 1px solid #ebe5d5; text-align: center;">
                  <p style="font-family: Arial, sans-serif; font-size: 12px; color: #a8967a; margin: 0;">
                    Message reçu via le formulaire de contact de ${SITE_NAME}
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

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
      if (req.method !== 'GET') {
        if (!applyRateLimit(req, res, 30, 60000)) {
          return;
        }
      }
      if (req.method === 'GET') {
        const hasBearer =
          typeof req.headers.authorization === 'string' &&
          req.headers.authorization.startsWith('Bearer ');
        if (hasBearer) {
          const auth = await verifyAuth(req, supabaseAuth);
          if (!auth.authenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }
          const adminCheck = await verifyAdmin(auth.user, supabase);
          if (!adminCheck.isAdmin) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
            return;
          }
          const { data, error } = await supabase
            .from('creations')
            .select('*')
            .order('display_order', { ascending: true });
          if (error) throw error;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data || []));
          return;
        }
        const { data, error } = await supabase
          .from('creations')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (error) throw error;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || []));
        return;
      }
      if (req.method === 'POST') {
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        const adminCheck = await verifyAdmin(auth.user, supabase);
        if (!adminCheck.isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
          return;
        }
        const body = await readBody(req);
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Le nom est requis' }));
          return;
        }
        const price = typeof body.price === 'string' && body.price.trim() ? body.price.trim() : '0 €';
        const description = typeof body.description === 'string' ? body.description : '';
        let imageUrl = null;
        if (body.image_url != null && body.image_url !== '') {
          imageUrl = String(body.image_url).trim() || null;
        }
        const is_active = body.is_active !== false;
        let display_order = 0;
        if (body.display_order !== undefined && body.display_order !== null) {
          const n = Number(body.display_order);
          if (Number.isFinite(n)) {
            display_order = Math.round(n);
          }
        }
        const { data, error } = await supabase
          .from('creations')
          .insert([
            {
              name,
              price,
              description,
              image_url: imageUrl,
              is_active,
              display_order
            }
          ])
          .select('*')
          .single();
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur lors de la création', details: error.message }));
          return;
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }
      if (req.method === 'PATCH') {
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        const adminCheck = await verifyAdmin(auth.user, supabase);
        if (!adminCheck.isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
          return;
        }
        const { id } = parsedUrl.query;
        if (!id || String(id).trim() === '') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id est requis' }));
          return;
        }
        const body = await readBody(req);
        const updateData = {};
        if (body.name !== undefined) {
          const n = String(body.name).trim();
          if (!n) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Le nom ne peut pas être vide' }));
            return;
          }
          updateData.name = n;
        }
        if (body.price !== undefined) {
          updateData.price = String(body.price).trim() || '0 €';
        }
        if (body.description !== undefined) {
          updateData.description = String(body.description);
        }
        if (body.image_url !== undefined) {
          const v = body.image_url;
          updateData.image_url = v == null || v === '' ? null : String(v).trim();
        }
        if (body.is_active !== undefined) {
          updateData.is_active = !!body.is_active;
        }
        if (body.display_order !== undefined && body.display_order !== null) {
          const n = Number(body.display_order);
          if (Number.isFinite(n)) {
            updateData.display_order = Math.round(n);
          }
        }
        if (Object.keys(updateData).length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Aucun champ à mettre à jour' }));
          return;
        }
        const { data, error } = await supabase
          .from('creations')
          .update(updateData)
          .eq('id', id)
          .select('*')
          .single();
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur lors de la mise à jour', details: error.message }));
          return;
        }
        if (!data) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Création introuvable' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }
      if (req.method === 'DELETE') {
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        const adminCheck = await verifyAdmin(auth.user, supabase);
        if (!adminCheck.isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
          return;
        }
        const { id } = parsedUrl.query;
        if (!id || String(id).trim() === '') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id est requis' }));
          return;
        }
        const { error } = await supabase.from('creations').delete().eq('id', id);
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur lors de la suppression', details: error.message }));
          return;
        }
        res.writeHead(204);
        res.end();
        return;
      }
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
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
    // NOUVELLE ROUTE : Créneaux bloqués
    else if (pathname === '/api/blocked-slots') {
      if (req.method === 'GET') {
        const { startDate, endDate } = parsedUrl.query;
        const today = new Date().toISOString().split('T')[0];
        let query = supabase
          .from('blocked_slots')
          .select('*')
          .gte('blocked_date', startDate || today)
          .order('blocked_date', { ascending: true })
          .order('start_time', { ascending: true });
        if (endDate) {
          query = query.lte('blocked_date', endDate);
        }
        const { data, error } = await query;
        if (error) throw error;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } else if (req.method === 'POST') {
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        try {
          const body = await readBody(req);
          const { blocked_date, start_time, reason } = body || {};
          if (!blocked_date || !start_time) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'blocked_date et start_time sont requis' }));
            return;
          }
          const timeMatch = String(start_time).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
          const normalizedTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}:00` : start_time;
          const { data, error } = await supabase
            .from('blocked_slots')
            .insert([{ blocked_date, start_time: normalizedTime, reason: reason || null }])
            .select('*')
            .single();
          if (error) throw error;
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || 'Erreur serveur' }));
        }
      } else if (req.method === 'DELETE') {
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        const { id } = parsedUrl.query;
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id est requis' }));
          return;
        }
        const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
        if (error) throw error;
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    }
    // Cartes cadeaux (admin)
    else if (pathname === '/api/gift-cards') {
      const requireGiftCardsAdmin = async () => {
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          return { ok: false, status: 401, body: { error: 'Unauthorized' } };
        }
        const adminCheck = await verifyAdmin(auth.user, supabase);
        if (!adminCheck.isAdmin) {
          return { ok: false, status: 403, body: { error: 'Forbidden: Admin access required' } };
        }
        return { ok: true };
      };

      if (req.method === 'GET') {
        const gate = await requireGiftCardsAdmin();
        if (!gate.ok) {
          res.writeHead(gate.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(gate.body));
          return;
        }
        const { data, error } = await supabase
          .from('gift_cards')
          .select('*')
          .order('purchase_date', { ascending: false });
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || []));
      } else if (req.method === 'POST') {
        const gate = await requireGiftCardsAdmin();
        if (!gate.ok) {
          res.writeHead(gate.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(gate.body));
          return;
        }
        try {
          const body = await readBody(req);
          const buyer_name = typeof body.buyer_name === 'string' ? body.buyer_name.trim() : '';
          const recipient_name = typeof body.recipient_name === 'string' ? body.recipient_name.trim() : '';
          const purchase_date = typeof body.purchase_date === 'string' ? body.purchase_date.trim() : '';
          const valid_until = typeof body.valid_until === 'string' ? body.valid_until.trim() : '';
          const service_label = typeof body.service_label === 'string' ? body.service_label.trim() : '';
          if (!buyer_name || !recipient_name || !purchase_date || !valid_until || !service_label) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Champs requis: buyer_name, recipient_name, purchase_date, valid_until, service_label' }));
            return;
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(purchase_date) || !/^\d{4}-\d{2}-\d{2}$/.test(valid_until)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Les dates doivent être au format YYYY-MM-DD' }));
            return;
          }
          const buyer_email = typeof body.buyer_email === 'string' ? body.buyer_email.trim().toLowerCase() : '';
          const recipient_email = typeof body.recipient_email === 'string' ? body.recipient_email.trim().toLowerCase() : '';
          const row = {
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
          if (error) throw error;
          let amount_eur = null;
          if (body.amount_eur != null && body.amount_eur !== '') {
            const n = typeof body.amount_eur === 'number' ? body.amount_eur : parseFloat(String(body.amount_eur).replace(',', '.').trim());
            if (!Number.isNaN(n) && n > 0) amount_eur = Math.round(n * 100) / 100;
          }

          const parseAdditionalSalesFromNotes = (notes) => {
            if (!notes) return [];
            try {
              const regex = new RegExp('\\[ADDITIONAL_SALES\\](.*?)\\[/ADDITIONAL_SALES\\]', 's');
              const match = notes.match(regex);
              if (match) {
                const parsed = JSON.parse(match[1]);
                return Array.isArray(parsed) ? parsed : [];
              }
            } catch (e) { /* ignore */ }
            return [];
          };
          const formatNotesWithAdditionalSales = (originalNotes, sales) => {
            let notes = originalNotes || '';
            const regex = new RegExp('\\[ADDITIONAL_SALES\\].*?\\[/ADDITIONAL_SALES\\]', 's');
            notes = notes.replace(regex, '').trim();
            if (sales.length > 0) {
              const salesJson = JSON.stringify(sales);
              const block = '[ADDITIONAL_SALES]' + salesJson + '[/ADDITIONAL_SALES]';
              notes = notes ? notes + '\n\n' + block : block;
            }
            return notes;
          };

          if (buyer_email || recipient_email) {
            const appendConsumableGiftCardSale = async (clientEmail, saleNotes) => {
              if (!clientEmail || !clientEmail.includes('@')) return;
              const { data: client, error: fetchErr } = await supabase
                .from('clients')
                .select('id, notes')
                .eq('email', clientEmail)
                .maybeSingle();
              if (fetchErr || !client?.id) return;
              const existing = parseAdditionalSalesFromNotes(client.notes);
              const sale = {
                date: purchase_date,
                type: 'gift_card',
                gift_card_id: data.id,
                notes: saleNotes
              };
              if (amount_eur != null && amount_eur > 0) sale.giftCardAmount = amount_eur;
              const newNotes = formatNotesWithAdditionalSales(client.notes, [...existing, sale]);
              await supabase.from('clients').update({ notes: newNotes }).eq('id', client.id);
            };
            try {
              if (!buyer_email && !recipient_email) {
                /* noop */
              } else if (buyer_email && recipient_email && buyer_email === recipient_email) {
                await appendConsumableGiftCardSale(
                  buyer_email,
                  `${service_label} — bénéficiaire : ${recipient_name}, valide jusqu'au ${valid_until}`
                );
              } else if (buyer_email && recipient_email && buyer_email !== recipient_email) {
                await appendConsumableGiftCardSale(
                  recipient_email,
                  `${service_label} — offert par ${buyer_name}, valide jusqu'au ${valid_until}`
                );
              } else if (recipient_email) {
                await appendConsumableGiftCardSale(
                  recipient_email,
                  `${service_label} — valide jusqu'au ${valid_until}`
                );
              } else {
                await appendConsumableGiftCardSale(
                  buyer_email,
                  `${service_label} — bénéficiaire : ${recipient_name}, valide jusqu'au ${valid_until}`
                );
              }
            } catch (e) {
              console.error('[gift-cards] Notes client:', e?.message || e);
            }
          }

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || 'Erreur serveur' }));
        }
      } else if (req.method === 'PATCH') {
        const gate = await requireGiftCardsAdmin();
        if (!gate.ok) {
          res.writeHead(gate.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(gate.body));
          return;
        }
        const { id } = parsedUrl.query;
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id est requis' }));
          return;
        }
        try {
          const { data: oldRow, error: fetchErr } = await supabase.from('gift_cards').select('*').eq('id', id).single();
          if (fetchErr || !oldRow) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Carte introuvable' }));
            return;
          }

          const body = await readBody(req);
          const updateData = {};
          const strFields = ['buyer_name', 'recipient_name', 'purchase_date', 'valid_until', 'service_label', 'notes'];
          for (const key of strFields) {
            if (body[key] !== undefined) {
              if (key === 'notes') {
                updateData[key] = body[key] === null || body[key] === '' ? null : String(body[key]).trim();
              } else if (key === 'purchase_date' || key === 'valid_until') {
                const d = String(body[key]).trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: `${key} doit être au format YYYY-MM-DD` }));
                  return;
                }
                updateData[key] = d;
              } else {
                updateData[key] = String(body[key]).trim();
              }
            }
          }
          if (body.buyer_email !== undefined) {
            updateData.buyer_email =
              typeof body.buyer_email === 'string' && body.buyer_email.trim()
                ? String(body.buyer_email).trim().toLowerCase()
                : null;
          }
          if (body.recipient_email !== undefined) {
            updateData.recipient_email =
              typeof body.recipient_email === 'string' && body.recipient_email.trim()
                ? String(body.recipient_email).trim().toLowerCase()
                : null;
          }
          if (body.used !== undefined) {
            updateData.used = !!body.used;
          }
          if (Object.keys(updateData).length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Aucun champ à mettre à jour' }));
            return;
          }
          const { data, error } = await supabase
            .from('gift_cards')
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single();
          if (error) throw error;

          const wasUsed = !!oldRow.used;
          const becameUsed = updateData.used === true && !wasUsed;
          if (becameUsed && data) {
            const parseAdditionalSalesFromNotes = (notes) => {
              if (!notes) return [];
              try {
                const regex = new RegExp('\\[ADDITIONAL_SALES\\](.*?)\\[/ADDITIONAL_SALES\\]', 's');
                const match = notes.match(regex);
                if (match) {
                  const parsed = JSON.parse(match[1]);
                  return Array.isArray(parsed) ? parsed : [];
                }
              } catch (e) { /* ignore */ }
              return [];
            };
            const formatNotesWithAdditionalSales = (originalNotes, sales) => {
              let notes = originalNotes || '';
              const regex = new RegExp('\\[ADDITIONAL_SALES\\].*?\\[/ADDITIONAL_SALES\\]', 's');
              notes = notes.replace(regex, '').trim();
              if (sales.length > 0) {
                const salesJson = JSON.stringify(sales);
                const block = '[ADDITIONAL_SALES]' + salesJson + '[/ADDITIONAL_SALES]';
                notes = notes ? notes + '\n\n' + block : block;
              }
              return notes;
            };
            const usageDate = new Date().toISOString().slice(0, 10);
            const gid = id;
            const be = (data.buyer_email || oldRow.buyer_email || '').trim().toLowerCase();
            const re = (data.recipient_email || oldRow.recipient_email || '').trim().toLowerCase();
            const bn = data.buyer_name;
            const rn = data.recipient_name;
            const pd = data.purchase_date;
            const sl = data.service_label;
            const tryMarkUsedOnClientEmail = async (email) => {
              if (!email || !email.includes('@')) return false;
              const { data: client, error: fe } = await supabase
                .from('clients')
                .select('id, notes')
                .eq('email', email)
                .maybeSingle();
              if (fe || !client?.id) return false;
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
                    s.date === pd &&
                    typeof s.notes === 'string' &&
                    s.notes.includes(sl)
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
            try {
              if (be && re && be !== re) {
                const okR = await tryMarkUsedOnClientEmail(re);
                if (!okR) await tryMarkUsedOnClientEmail(be);
              } else {
                await tryMarkUsedOnClientEmail(be || re);
              }
            } catch (e) {
              console.error('[gift-cards] Vente utilisation:', e?.message || e);
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || 'Erreur serveur' }));
        }
      } else if (req.method === 'DELETE') {
        const gate = await requireGiftCardsAdmin();
        if (!gate.ok) {
          res.writeHead(gate.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(gate.body));
          return;
        }
        const { id } = parsedUrl.query;
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id est requis' }));
          return;
        }
        const { error } = await supabase.from('gift_cards').delete().eq('id', id);
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
        res.writeHead(204);
        res.end();
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
        
        const validStatuses = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];
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

        // Essayer avec la relation complète (incluant la durée pour le blocage dynamique)
        let query = supabase
          .from('appointments')
          .select(`
            *,
            prestations (
              name,
              duration
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

        // Vérifier si c'est une création admin (authentifié = pas de captcha requis, email optionnel)
        let isAdminCreation = false;
        if (req.headers.authorization) {
          const authCheck = await verifyAuth(req, supabaseAuth);
          if (authCheck.authenticated) {
            const adminCheck = await verifyAdmin(authCheck.user, supabase);
            if (adminCheck.isAdmin) {
              isAdminCreation = true;
            }
          }
        }

        // Valider les données d'entrée (mode admin = email optionnel)
        const validation = isAdminCreation
          ? validateAppointmentAdmin(body)
          : validateAppointment(body);
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
            
            if (isMamanBebe && (!sanitizedData.child_age || sanitizedData.child_age === null || sanitizedData.child_age === undefined)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Données invalides',
                details: ['L\'âge de l\'enfant est obligatoire pour cette prestation']
              }));
              return;
            }
            
            // Vérifier que l'âge est dans la plage valide (0-24 mois)
            if (isMamanBebe && sanitizedData.child_age !== undefined && sanitizedData.child_age !== null) {
              if (sanitizedData.child_age < 0 || sanitizedData.child_age > 24) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  error: 'Données invalides',
                  details: ['L\'âge de l\'enfant doit être entre 0 et 24 mois (2 ans)']
                }));
                return;
              }
            }
          }
        }

        // Fonction pour convertir une durée texte en minutes (ex: "1h30" → 90, "45min" → 45)
        function parseDurationToMinutes(duration) {
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
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de la vérification des créneaux',
            ...(isDevelopment && { details: checkError.message })
          }));
          return;
        }

        // Vérifier si le créneau demandé chevauche avec une plage bloquée (basée sur les durées réelles)
        if (existingAppointments && existingAppointments.length > 0) {
          // Fonction pour formater les minutes en HH:MM
          function formatTimeMinutes(minutes) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          }

          const [newHour, newMin] = appointment_time.split(':').map(Number);
          const newTime = newHour * 60 + newMin;
          const newEndTime = newTime + newPrestationDuration; // Utiliser la durée de la prestation à réserver
          
          for (const apt of existingAppointments) {
            const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number);
            const aptTime = aptHour * 60 + aptMin;
            
            // Récupérer la durée du rendez-vous existant
            const aptDuration = parseDurationToMinutes(apt.prestations?.duration);
            
            // Plage bloquée : calculée en fonction des durées réelles
            const blockStart = Math.max(0, aptTime - newPrestationDuration);
            const blockEnd = aptTime + aptDuration;
            
            // Bloquer si :
            // 1. Le créneau commence dans la plage bloquée (inclus le début, exclu la fin)
            // 2. OU le créneau se termine après le début du RDV existant
            const startsInBlockedRange = newTime >= blockStart && newTime < blockEnd;
            const endsTooCloseBefore = newTime < blockStart && newEndTime > blockStart;
            
            if (startsInBlockedRange || endsTooCloseBefore) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Ce créneau est déjà réservé',
                message: `Un rendez-vous existe à ${apt.appointment_time} et bloque les créneaux de ${formatTimeMinutes(blockStart)} à ${formatTimeMinutes(blockEnd)}`
              }));
              return;
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
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Ce créneau n\'est pas disponible',
            message: 'Ce créneau a été bloqué par le praticien.'
          }));
          return;
        }

        // Insérer uniquement les champs autorisés et validés
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
            created_at,
            updated_at,
            child_age,
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
        
        // Créer automatiquement le client dans la table clients s'il n'existe pas
        if (data && data.client_email) {
          const clientEmail = data.client_email.toLowerCase().trim();
          
          console.log(`[Appointments POST] ===== CRÉATION CLIENT =====`);
          console.log(`[Appointments POST] Email: "${clientEmail}"`);
          console.log(`[Appointments POST] Nom: "${data.client_name || 'null'}"`);
          console.log(`[Appointments POST] Téléphone: "${data.client_phone || 'null'}"`);
          
          try {
            // ÉTAPE 1: Vérifier si le client existe déjà
            console.log(`[Appointments POST] ÉTAPE 1: Vérification existence...`);
            const { data: existingClient, error: checkError } = await supabase
              .from('clients')
              .select('id, email')
              .eq('email', clientEmail)
              .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
              console.error(`[Appointments POST] ❌ Erreur vérification:`, checkError);
            }
            
            if (existingClient) {
              console.log(`[Appointments POST] ✅ Client existe déjà: ${clientEmail} (ID: ${existingClient.id})`);
            } else {
              console.log(`[Appointments POST] ÉTAPE 2: Client n'existe pas, INSERT en cours...`);
              
              // ÉTAPE 2: Insérer le client (SIMPLE - juste les champs de base)
              // Validation et limitation de taille pour la sécurité
              const clientData = {
                email: clientEmail,
                name: (data.client_name || '').trim().substring(0, 100) || null, // Max 100 caractères
                phone: (data.client_phone || '').trim().substring(0, 20) || null // Max 20 caractères
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
          } catch (error) {
            console.error('[Appointments POST] ❌ EXCEPTION lors de la création du client:', error);
            console.error('[Appointments POST] Stack:', error.stack);
          }
        } else {
          console.log('[Appointments POST] ⚠️ Pas de client_email dans les données');
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
        const updateData = {};
        
        // Gérer le statut si fourni
        if (body.status !== undefined) {
          const validStatuses = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];
          const status = body.status?.toLowerCase()?.trim();
          if (!status || !validStatuses.includes(status)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }));
            return;
          }
          updateData.status = status;
        }
        
        // Gérer les notes si fournies
        if (body.notes !== undefined && body.notes !== null) {
          updateData.notes = body.notes;
        }
        
        // Gérer le mode de paiement si fourni
        if (body.payment_method !== undefined) {
          const validPaymentMethods = ['espèces', 'carte', 'virement', 'chèque', 'carte_cadeau', 'mixte', null];
          if (body.payment_method !== null && !validPaymentMethods.includes(body.payment_method)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: `Invalid payment_method. Must be one of: ${validPaymentMethods.filter(m => m !== null).join(', ')}, or null` 
            }));
            return;
          }
          updateData.payment_method = body.payment_method;
        }

        // Complément hors carte pour les RDV « mixte » (colonne à ajouter en base si besoin)
        if (body.mixte_complement_payment_method !== undefined) {
          const validMixteComp = ['espèces', 'carte', 'virement', 'chèque', null];
          if (
            body.mixte_complement_payment_method !== null &&
            !validMixteComp.includes(body.mixte_complement_payment_method)
          ) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: `Invalid mixte_complement_payment_method. Must be one of: ${validMixteComp.filter((m) => m !== null).join(', ')}, or null`
            }));
            return;
          }
          updateData.mixte_complement_payment_method = body.mixte_complement_payment_method;
        }
        
        // Vérifier qu'au moins un champ est fourni
        if (Object.keys(updateData).length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No valid fields to update' }));
          return;
        }

        console.log('Updating appointment:', id, 'with data:', updateData);

        // Nettoyer complètement l'objet
        const cleanUpdateData = { ...updateData };

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
      else if (req.method === 'DELETE') {
        const auth = await verifyAuth(req, supabaseAuth);
        if (!auth.authenticated) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        const adminCheck = await verifyAdmin(auth.user, supabase);
        if (!adminCheck.isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
          return;
        }
        const { id } = parsedUrl.query;
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id est requis' }));
          return;
        }
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur lors de la suppression', details: error.message }));
          return;
        }
        res.writeHead(204);
        res.end();
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

      // GET - Récupérer un client par email, id ou clientId
      if (req.method === 'GET') {
        // Rate limiting pour GET : 200 par minute (plus permissif car authentifié)
        if (!applyRateLimit(req, res, 200, 60000)) {
          return;
        }
        
        const { email, id, clientId } = parsedUrl.query;

        // Liste complète de tous les clients (sans filtre)
        if (!email && !id && !clientId) {
          const { data: allClients, error: listError } = await supabase
            .from('clients')
            .select('*')
            .order('name', { ascending: true });

          if (listError) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Erreur lors de la récupération des clients', details: listError.message }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(allClients || []));
          return;
        }

        let data;
        let error;
        let searchEmail = null;

        if (clientId) {
          // Recherche par clientId (identifiant opaque)
          // D'abord essayer de trouver directement par la colonne client_id
          const { data: clientByColumn, error: columnError } = await supabase
            .from('clients')
            .select('*')
            .eq('client_id', clientId)
            .single();
          
          if (clientByColumn && !columnError) {
            data = clientByColumn;
            searchEmail = clientByColumn.email;
          } else {
            // Fallback: chercher dans tous les clients et vérifier le clientId
            const { data: allClients, error: fetchError } = await supabase
              .from('clients')
              .select('*')
              .limit(1000);
            
            if (!fetchError && allClients) {
              // Fonction pour générer clientId depuis email
              const crypto = require('crypto');
              const secret = process.env.CLIENT_ID_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
              if (!secret) {
                console.error('[Clients GET] ⚠️ CLIENT_ID_SECRET non défini, utilisation de SERVICE_ROLE_KEY');
              }
              
              function generateClientId(email) {
                if (!secret) {
                  throw new Error('CLIENT_ID_SECRET ou SUPABASE_SERVICE_ROLE_KEY requis pour générer clientId');
                }
                const normalizedEmail = email.toLowerCase().trim();
                const hmac = crypto.createHmac('sha256', secret);
                hmac.update(normalizedEmail);
                const hash = hmac.digest('base64');
                return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substring(0, 16);
              }
              
              // Chercher le client avec le clientId correspondant
              for (const client of allClients) {
                if (client.email && generateClientId(client.email) === clientId) {
                  data = client;
                  searchEmail = client.email;
                  break;
                }
              }
              
              // Si pas trouvé dans clients, chercher dans appointments
              if (!data) {
                const { data: appointments } = await supabase
                  .from('appointments')
                  .select('client_email, client_name, client_phone')
                  .limit(1000);
                
                if (appointments) {
                  for (const apt of appointments) {
                    if (apt.client_email && generateClientId(apt.client_email) === clientId) {
                      searchEmail = apt.client_email.toLowerCase().trim();
                      // Créer le client automatiquement
                      const { data: newClient, error: createError } = await supabase
                        .from('clients')
                        .insert({
                          email: searchEmail,
                          name: apt.client_name || null,
                          phone: apt.client_phone || null
                        })
                        .select()
                        .single();
                      
                      if (!createError && newClient) {
                        data = newClient;
                      }
                      break;
                    }
                  }
                }
              }
            }
            
            if (!data) {
              error = { code: 'PGRST116' };
            }
          }
        } else if (id) {
          // Recherche par UUID
          const result = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
          data = result.data;
          error = result.error;
          if (data) searchEmail = data.email;
        } else if (email) {
          // Recherche par email
          searchEmail = email.toLowerCase().trim();
          const result = await supabase
            .from('clients')
            .select('*')
            .eq('email', searchEmail)
            .single();
          data = result.data;
          error = result.error;
        }

        // Si le client n'existe pas dans la table clients, vérifier s'il existe dans les rendez-vous
        if (error && error.code === 'PGRST116' && searchEmail) {
          console.log(`[Clients GET] Client non trouvé, recherche dans les rendez-vous pour: "${searchEmail}"`);
          
          const normalizedSearchEmail = searchEmail.toLowerCase().trim();
          const { data: appointments, error: aptError } = await supabase
            .from('appointments')
            .select('client_name, client_email, client_phone')
            .eq('client_email', normalizedSearchEmail)
            .limit(1);
          
          if (!aptError && appointments && appointments.length > 0) {
            const appointment = appointments[0];
            const appointmentEmail = appointment.client_email?.toLowerCase().trim();
            
            if (appointmentEmail) {
              console.log(`[Clients GET] Rendez-vous trouvé, création du client...`);
              
              // Validation et limitation de taille pour la sécurité
              const clientData = {
                email: appointmentEmail,
                name: (appointment.client_name || '').trim().substring(0, 100) || null, // Max 100 caractères
                phone: (appointment.client_phone || '').trim().substring(0, 20) || null // Max 20 caractères
              };
              
              // Validation supplémentaire de l'email
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(clientData.email)) {
                console.error(`[Clients GET] ❌ Email invalide: "${clientData.email}"`);
                error = { code: 'PGRST116' }; // Simuler "non trouvé"
              } else {
                const { data: newClient, error: createError } = await supabase
                  .from('clients')
                  .insert(clientData)
                  .select()
                  .single();
                
                if (!createError && newClient) {
                  data = newClient;
                  error = null;
                  console.log(`[Clients GET] ✅ Client créé automatiquement: ${appointmentEmail}`);
                } else {
                  error = createError;
                }
              }
            }
          }
        }

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

        // Ajouter clientId dans la réponse si pas déjà présent
        if (data && data.email && !data.clientId) {
          const crypto = require('crypto');
          const secret = process.env.CLIENT_ID_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (secret) {
            const normalizedEmail = data.email.toLowerCase().trim();
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(normalizedEmail);
            const hash = hmac.digest('base64');
            data.clientId = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substring(0, 16);
          } else {
            console.warn('[Clients GET] ⚠️ Impossible de générer clientId: CLIENT_ID_SECRET non défini');
          }
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

        // Ajouter clientId dans la réponse si pas déjà présent
        if (data && data.email && !data.clientId) {
          const crypto = require('crypto');
          const secret = process.env.CLIENT_ID_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (secret) {
            const normalizedEmail = data.email.toLowerCase().trim();
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(normalizedEmail);
            const hash = hmac.digest('base64');
            data.clientId = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substring(0, 16);
          } else {
            console.warn('[Clients POST] ⚠️ Impossible de générer clientId: CLIENT_ID_SECRET non défini');
          }
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

        const computeClientId = (normEmail) => {
          const crypto = require('crypto');
          const secret = process.env.CLIENT_ID_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!secret) return null;
          const hmac = crypto.createHmac('sha256', secret);
          hmac.update(normEmail);
          const hash = hmac.digest('base64');
          return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substring(0, 16);
        };

        const oldEmail = email.toLowerCase().trim();

        const { data: currentRow, error: fetchErr } = await supabase
          .from('clients')
          .select('id, email')
          .eq('email', oldEmail)
          .maybeSingle();

        if (fetchErr) {
          const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Erreur lors de la récupération du client',
            ...(isDevelopment && { details: fetchErr.message })
          }));
          return;
        }
        if (!currentRow?.id) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Client non trouvé' }));
          return;
        }

        let newEmail = oldEmail;
        if (updates.email !== undefined && updates.email !== null) {
          const raw = String(updates.email).trim().toLowerCase();
          if (!raw || !raw.includes('@') || raw.length > 254) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Adresse e-mail invalide' }));
            return;
          }
          newEmail = raw;
        }

        if (newEmail !== oldEmail) {
          const { data: other, error: conflictErr } = await supabase
            .from('clients')
            .select('id')
            .eq('email', newEmail)
            .maybeSingle();

          if (conflictErr) {
            const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Erreur lors de la vérification de l\'e-mail',
              ...(isDevelopment && { details: conflictErr.message })
            }));
            return;
          }

          if (other?.id && other.id !== currentRow.id) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cette adresse e-mail est déjà utilisée' }));
            return;
          }

          const { error: aptErr } = await supabase
            .from('appointments')
            .update({ client_email: newEmail })
            .eq('client_email', oldEmail);
          if (aptErr) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Erreur lors de la mise à jour des rendez-vous',
              details: aptErr.message
            }));
            return;
          }

          const { error: gcBuyerErr } = await supabase
            .from('gift_cards')
            .update({ buyer_email: newEmail })
            .eq('buyer_email', oldEmail);
          if (gcBuyerErr) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Erreur lors de la mise à jour des cartes cadeaux',
              details: gcBuyerErr.message
            }));
            return;
          }

          const { error: gcRecErr } = await supabase
            .from('gift_cards')
            .update({ recipient_email: newEmail })
            .eq('recipient_email', oldEmail);
          if (gcRecErr) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Erreur lors de la mise à jour des cartes cadeaux',
              details: gcRecErr.message
            }));
            return;
          }
        }

        const dataToUpdate = {};
        const cid = computeClientId(newEmail);
        if (cid) {
          dataToUpdate.client_id = cid;
        }
        if (newEmail !== oldEmail) {
          dataToUpdate.email = newEmail;
        }
        if (updates.name !== undefined) dataToUpdate.name = updates.name;
        if (updates.phone !== undefined) dataToUpdate.phone = updates.phone || null;
        if (updates.birthdate !== undefined) dataToUpdate.birthdate = updates.birthdate || null;
        if (updates.notes !== undefined) dataToUpdate.notes = updates.notes || null;

        const { data, error } = await supabase
          .from('clients')
          .update(dataToUpdate)
          .eq('email', oldEmail)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cette adresse e-mail est déjà utilisée' }));
            return;
          }
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

        if (data && data.email && !data.clientId) {
          const secret = process.env.CLIENT_ID_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (secret) {
            const crypto = require('crypto');
            const normalizedEmail = data.email.toLowerCase().trim();
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(normalizedEmail);
            const hash = hmac.digest('base64');
            data.clientId = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substring(0, 16);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
      else if (req.method === 'DELETE') {
        const { id } = parsedUrl.query;
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id est requis' }));
          return;
        }
        const { data: clientRow, error: fetchError } = await supabase
          .from('clients')
          .select('email, name, phone')
          .eq('id', id)
          .single();
        if (fetchError || !clientRow) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Client non trouvé' }));
          return;
        }
        const normalizedEmail = (clientRow.email || '').trim().toLowerCase();
        if (normalizedEmail) {
          const { error: delAptError } = await supabase
            .from('appointments')
            .delete()
            .eq('client_email', normalizedEmail);
          if (delAptError) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Erreur lors de la suppression des rendez-vous associés',
              details: delAptError.message
            }));
            return;
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
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Erreur lors de la suppression des rendez-vous associés',
                details: delAptError.message
              }));
              return;
            }
          } else {
            const { error: e1 } = await supabase
              .from('appointments')
              .delete()
              .eq('client_name', name)
              .is('client_email', null);
            if (e1) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Erreur lors de la suppression des rendez-vous associés',
                details: e1.message
              }));
              return;
            }
            const { error: e2 } = await supabase
              .from('appointments')
              .delete()
              .eq('client_name', name)
              .eq('client_email', '');
            if (e2) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Erreur lors de la suppression des rendez-vous associés',
                details: e2.message
              }));
              return;
            }
          }
        }
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur lors de la suppression du client', details: error.message }));
          return;
        }
        res.writeHead(204);
        res.end();
      }
      else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    }
    // POST /api/creations/upload | /api/creations-image — image admin (même logique que api/[...path].ts)
    else if (
      (pathname === '/api/creations/upload' || pathname === '/api/creations-image') &&
      req.method === 'POST'
    ) {
      if (!applyRateLimit(req, res, 20, 60000)) {
        return;
      }
      const auth = await verifyAuth(req, supabaseAuth);
      if (!auth.authenticated) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const adminCheck = await verifyAdmin(auth.user, supabase);
      if (!adminCheck.isAdmin) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
        return;
      }
      try {
        const body = await readBody(req);
        const b64 = typeof body.content_base64 === 'string' ? String(body.content_base64).trim() : '';
        if (!b64) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'content_base64 est requis' }));
          return;
        }
        if (b64.length > 9200000) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Fichier trop volumineux' }));
          return;
        }
        let buffer;
        try {
          buffer = Buffer.from(b64, 'base64');
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Encodage base64 invalide' }));
          return;
        }
        const maxBytes = 6 * 1024 * 1024;
        if (buffer.length > maxBytes) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Fichier trop volumineux (6 Mo max.)' }));
          return;
        }
        if (buffer.length < 8) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Fichier image invalide ou vide' }));
          return;
        }
        const contentType = typeof body.content_type === 'string' && String(body.content_type).trim()
          ? String(body.content_type).trim().toLowerCase()
          : '';
        const extByType = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'image/avif': 'avif'
        };
        const ext = extByType[contentType] || '';
        if (!ext) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Type d'image non autorisé" }));
          return;
        }
        const objectPath = `creations/${Date.now()}-${Math.random().toString(36).slice(2, 12)}.${ext}`;
        const { data, error: upErr } = await supabase.storage
          .from('site-media')
          .upload(objectPath, buffer, { contentType, cacheControl: '3600', upsert: true });
        if (upErr) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Échec du téléversement', details: upErr.message }));
          return;
        }
        if (!data || !data.path) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Échec du téléversement' }));
          return;
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ path: data.path }));
      } catch (err) {
        console.error('[creations/upload]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
      }
    }
    // ROUTE : Contact (envoi d'email)
    else if (pathname === '/api/contact') {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      
      // Rate limiting strict pour éviter les abus (5 messages par minute max)
      if (!applyRateLimit(req, res, 5, 60000)) {
        return;
      }
      
      const body = await readBody(req);
      const { name, email, phone, subject, message, captcha_token } = body;
      
      // Validation des champs obligatoires
      const errors = [];
      
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
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Validation échouée', 
          details: errors 
        }));
        return;
      }
      
      // Vérifier que les variables d'environnement pour l'email sont configurées
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
      const FROM_EMAIL = process.env.FROM_EMAIL;
      
      if (!RESEND_API_KEY) {
        console.error('[Contact] ❌ RESEND_API_KEY non configuré');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Configuration email manquante',
          message: 'Le service d\'envoi d\'email n\'est pas configuré. Contactez l\'administrateur.'
        }));
        return;
      }
      
      // En mode local, simuler l'envoi ou utiliser l'API Resend directement
      try {
        // Utiliser l'API Resend via fetch (disponible dans Node 18+)
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: FROM_EMAIL || 'onboarding@resend.dev',
            to: ADMIN_EMAIL || 'admin@example.com',
            reply_to: email.trim().toLowerCase(),
            subject: `✉️ Contact: ${subject.trim()} - de ${name.trim()}`,
            html: generateContactEmailHtml({
              name: name.trim(),
              email: email.trim().toLowerCase(),
              phone: phone?.trim() || '',
              subject: subject.trim(),
              message: message.trim()
            })
          })
        });
        
        if (response.ok) {
          console.log(`[Contact] ✅ Message envoyé de: ${email}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Votre message a bien été envoyé. Je vous répondrai dans les plus brefs délais.' 
          }));
        } else {
          const errorData = await response.json();
          console.error(`[Contact] ❌ Erreur Resend:`, errorData);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Erreur lors de l\'envoi', 
            message: 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.' 
          }));
        }
      } catch (error) {
        console.error('[Contact] ❌ Erreur:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Erreur serveur', 
          message: 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.' 
        }));
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
  console.log(`   - http://localhost:${PORT}/api/blocked-slots (GET, POST, DELETE)`);
  console.log(`   - http://localhost:${PORT}/api/gift-cards (GET, POST, PATCH, DELETE)`);
  console.log(`   - http://localhost:${PORT}/api/appointments (GET, POST, PATCH)`);
  console.log(`   - http://localhost:${PORT}/api/clients (GET, POST, PATCH) - PROTÉGÉ`);
  console.log(`   - http://localhost:${PORT}/api/contact (POST) - Formulaire de contact`);
});