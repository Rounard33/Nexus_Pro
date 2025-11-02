/**
 * Script pour générer les fichiers environment.ts depuis .env
 * Usage: node scripts/generate-env.js
 */

const fs = require('fs');
const path = require('path');

// Chemins des fichiers
const envPath = path.join(__dirname, '..', '.env');
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envDevPath = path.join(__dirname, '..', '.env.development');
const envProdPath = path.join(__dirname, '..', '.env.production');
const envTsPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
const envProdTsPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

/**
 * Lit un fichier .env et retourne un objet avec les clés/valeurs
 */
function parseEnvFile(filePath) {
  const env = {};
  
  if (!fs.existsSync(filePath)) {
    return env;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  // Gère aussi les retours chariot Windows (\r\n) et Unix (\n)
  const lines = content.split(/\r?\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Ignore les commentaires et les lignes vides
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Parse KEY=VALUE (plus flexible avec espaces)
    const match = trimmed.match(/^([^=#\s]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Retire les guillemets si présents
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      env[key] = value;
    }
  }
  
  return env;
}

/**
 * Génère le contenu du fichier environment.ts
 */
function generateEnvironmentFile(env, isProduction = false) {
  // Priorité: NG_APP_* > variables directes > variables système
  // Supporte plusieurs noms de variables pour flexibilité
  const supabaseUrl = process.env.NG_APP_SUPABASE_URL || 
                     env.NG_APP_SUPABASE_URL || 
                     env.SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     '';
  
  // Supporte SUPABASE_ANON_KEY, SUPABASE_KEY, ANON_KEY
  const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || 
                         env.NG_APP_SUPABASE_ANON_KEY || 
                         env.SUPABASE_ANON_KEY || 
                         process.env.SUPABASE_ANON_KEY || 
                         env.SUPABASE_KEY ||
                         process.env.SUPABASE_KEY ||
                         env.ANON_KEY ||
                         process.env.ANON_KEY ||
                         '';

  const apiUrl = process.env.NG_APP_API_URL || 
    env.NG_APP_API_URL || 
    env.API_URL || 
    process.env.API_URL || 
    (isProduction ? 'https://nexus-pro-liart.vercel.app/api' : 'http://localhost:3000/api');


  return `export const environment = {
  production: ${isProduction},
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
  apiUrl: '${apiUrl}',
};
`;
}

// Charger les variables d'environnement depuis les fichiers .env
// Ordre de priorité: .env.local > .env > .env.development / .env.production
let env = {};

// Charger .env de base (si existe)
if (fs.existsSync(envPath)) {
  env = { ...env, ...parseEnvFile(envPath) };
}

// Charger .env.local (prioritaire, écrase .env)
if (fs.existsSync(envLocalPath)) {
  const envLocal = parseEnvFile(envLocalPath);
  env = { ...env, ...envLocal };
  // Debug: afficher les clés trouvées si variables Supabase manquantes
  if (!env.SUPABASE_ANON_KEY && !env.NG_APP_SUPABASE_ANON_KEY && !env.SUPABASE_KEY && !env.ANON_KEY) {
    console.log('🔍 Variables trouvées dans .env.local:', Object.keys(envLocal).join(', ') || 'aucune');
  }
}

// Charger .env.development pour dev
const envDev = parseEnvFile(envDevPath);
// Charger .env.production pour prod
const envProd = parseEnvFile(envProdPath);

// Générer environment.ts (dev)
const devContent = generateEnvironmentFile({ ...env, ...envDev }, false);
fs.writeFileSync(envTsPath, devContent, 'utf-8');
console.log('✅ environment.ts généré');

// Générer environment.prod.ts (production)
const prodContent = generateEnvironmentFile({ ...env, ...envProd }, true);
fs.writeFileSync(envProdTsPath, prodContent, 'utf-8');
console.log('✅ environment.prod.ts généré');

// Vérifier si les valeurs sont vides
if (devContent.includes("supabaseUrl: ''") || devContent.includes("supabaseAnonKey: ''")) {
  console.log('⚠️  Certaines variables Supabase sont manquantes.');
  console.log('   Créez un fichier .env ou .env.local avec:');
  console.log('   SUPABASE_URL=https://votre-projet.supabase.co');
  console.log('   SUPABASE_ANON_KEY=votre_anon_key');
} else {
  console.log('✅ Variables Supabase configurées correctement');
}
