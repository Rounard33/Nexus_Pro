/**
 * Script pour remplir les client_id des clients existants dans Supabase
 * 
 * Usage: node scripts/populate-client-ids.mjs
 * 
 * Prérequis:
 * - Variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 * - Ou définir CLIENT_ID_SECRET
 */

import {createClient} from '@supabase/supabase-js';
import {createHmac} from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getSecret() {
  return process.env.CLIENT_ID_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret-change-me';
}

function generateClientId(email) {
  const secret = getSecret();
  const normalizedEmail = email.toLowerCase().trim();
  
  const hmac = createHmac('sha256', secret);
  hmac.update(normalizedEmail);
  const hash = hmac.digest('base64');
  
  return hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 16);
}

async function populateClientIds() {
  console.log('🔄 Récupération des clients sans client_id...');
  
  // Récupérer tous les clients sans client_id
  const { data: clients, error: fetchError } = await supabase
    .from('clients')
    .select('id, email, client_id')
    .is('client_id', null);
  
  if (fetchError) {
    console.error('❌ Erreur lors de la récupération des clients:', fetchError);
    return;
  }
  
  if (!clients || clients.length === 0) {
    console.log('✅ Tous les clients ont déjà un client_id');
    return;
  }
  
  console.log(`📝 ${clients.length} client(s) à mettre à jour`);
  
  // Mettre à jour chaque client
  let successCount = 0;
  let errorCount = 0;
  
  for (const client of clients) {
    if (!client.email) {
      console.warn(`⚠️  Client ${client.id} n'a pas d'email, ignoré`);
      continue;
    }
    
    const clientId = generateClientId(client.email);
    
    const { error: updateError } = await supabase
      .from('clients')
      .update({ client_id: clientId })
      .eq('id', client.id);
    
    if (updateError) {
      console.error(`❌ Erreur pour client ${client.email}:`, updateError);
      errorCount++;
    } else {
      console.log(`✅ ${client.email} -> ${clientId}`);
      successCount++;
    }
  }
  
  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Succès: ${successCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log(`   📝 Total: ${clients.length}`);
}

populateClientIds()
  .then(() => {
    console.log('\n✨ Migration terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

