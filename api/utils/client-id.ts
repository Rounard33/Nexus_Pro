/**
 * Utilitaires pour générer des identifiants opaques pour les clients
 * Utilise un hash HMAC pour créer un identifiant sécurisé à partir de l'email
 */

import {createHmac} from 'crypto';

/**
 * Récupère le secret pour le hash (doit être défini dans les variables d'environnement)
 */
function getSecret(): string {
  const secret = process.env['CLIENT_ID_SECRET'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!secret) {
    console.error('❌ CLIENT_ID_SECRET et SUPABASE_SERVICE_ROLE_KEY non définis - impossible de générer clientId');
    throw new Error('CLIENT_ID_SECRET ou SUPABASE_SERVICE_ROLE_KEY requis pour générer clientId');
  }
  if (!process.env['CLIENT_ID_SECRET'] && process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    console.warn('⚠️ CLIENT_ID_SECRET non défini, utilisation de SUPABASE_SERVICE_ROLE_KEY (recommandé: définir CLIENT_ID_SECRET séparément)');
  }
  return secret;
}

/**
 * Génère un identifiant opaque à partir de l'email
 * @param email Email du client
 * @returns Identifiant opaque (base64url encodé)
 */
export function generateClientId(email: string): string {
  const secret = getSecret();
  const normalizedEmail = email.toLowerCase().trim();
  
  // Utiliser HMAC-SHA256 pour créer un hash sécurisé
  const hmac = createHmac('sha256', secret);
  hmac.update(normalizedEmail);
  const hash = hmac.digest('base64');
  
  // Convertir en base64url (URL-safe) et prendre les 16 premiers caractères
  return hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 16);
}

/**
 * Vérifie si un identifiant correspond à un email
 * @param clientId Identifiant opaque
 * @param email Email du client
 * @returns true si l'identifiant correspond à l'email
 */
export function verifyClientId(clientId: string, email: string): boolean {
  const generatedId = generateClientId(email);
  return generatedId === clientId;
}

/**
 * Trouve un client par son identifiant opaque
 * 
 * Utilise la colonne client_id si elle existe, sinon itère sur les clients
 * 
 * @param supabase Client Supabase
 * @param clientId Identifiant opaque
 * @returns Client trouvé ou null
 */
export async function findClientById(supabase: any, clientId: string): Promise<any | null> {
  // D'abord, essayer de trouver directement par la colonne client_id (si elle existe)
  const { data: clientByColumn, error: columnError } = await supabase
    .from('clients')
    .select('*')
    .eq('client_id', clientId)
    .single();
  
  // Si la colonne existe et qu'on trouve un résultat, le retourner
  if (clientByColumn && !columnError) {
    return clientByColumn;
  }
  
  // Si la colonne n'existe pas ou si aucun résultat, fallback sur l'ancienne méthode
  // (pour compatibilité avec les anciennes bases de données)
  if (columnError && columnError.code !== 'PGRST116') {
    // PGRST116 = "no rows returned", ce qui est normal si le client n'existe pas
    // Les autres erreurs peuvent indiquer que la colonne n'existe pas encore
    console.log('[Client ID] Colonne client_id non disponible, utilisation du fallback');
  }
  
  // Fallback: itérer sur les clients ET les rendez-vous pour trouver l'email correspondant
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .limit(1000);
  
  if (error) {
    console.error('Erreur lors de la récupération des clients:', error);
  }
  
  // Chercher dans les clients existants
  if (clients && clients.length > 0) {
    for (const client of clients) {
      if (verifyClientId(clientId, client.email)) {
        return client;
      }
    }
  }
  
  // Si pas trouvé dans les clients, chercher dans les rendez-vous
  // Récupérer tous les emails uniques des rendez-vous
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('client_email, client_name, client_phone')
    .limit(1000);
  
  if (aptError) {
    console.error('Erreur lors de la récupération des rendez-vous:', aptError);
    return null;
  }
  
  if (!appointments || appointments.length === 0) {
    return null;
  }
  
  // Trouver l'email correspondant au clientId dans les rendez-vous
  const uniqueEmails = new Set<string>();
  for (const apt of appointments) {
    if (apt.client_email && !uniqueEmails.has(apt.client_email)) {
      uniqueEmails.add(apt.client_email);
      if (verifyClientId(clientId, apt.client_email)) {
        // Créer le client automatiquement
        const { data: newClient, error: createError } = await supabase
          .from('clients')
          .upsert({
            email: apt.client_email.toLowerCase().trim(),
            name: apt.client_name || null,
            phone: apt.client_phone || null,
            client_id: clientId
          }, {
            onConflict: 'email',
            ignoreDuplicates: false
          })
          .select()
          .single();
        
        if (createError) {
          console.error('[Client ID] Erreur lors de la création automatique:', createError);
          return null;
        }
        
        console.log(`[Client ID] Client créé automatiquement depuis les rendez-vous: ${apt.client_email}`);
        return newClient;
      }
    }
  }
  
  return null;
}

