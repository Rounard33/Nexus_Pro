/**
 * Helper pour générer le clientId côté frontend
 * Note: Cette fonction doit utiliser le même algorithme que le backend
 * pour garantir la cohérence. Cependant, sans le secret, on ne peut pas
 * générer le même hash. Pour l'instant, on utilise une approche simplifiée.
 * 
 * ⚠️ IMPORTANT: Pour une vraie sécurité, le clientId devrait être généré
 * uniquement côté serveur. Cette fonction est un fallback temporaire.
 */

/**
 * Génère un identifiant simple à partir de l'email
 * ⚠️ Cette fonction ne génère PAS le même hash que le backend
 * Elle sert uniquement de fallback pour la navigation
 * Le vrai clientId sera généré côté serveur lors de la requête API
 * 
 * @param email Email du client
 * @returns Identifiant temporaire (ne correspond pas au hash serveur)
 */
export function generateTemporaryClientId(email: string): string {
  // Simple hash basé sur l'email (non sécurisé, juste pour la navigation)
  // Le vrai clientId sera récupéré depuis l'API
  const normalizedEmail = email.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalizedEmail.length; i++) {
    const char = normalizedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convertir en base36 et prendre les 12 premiers caractères
  return Math.abs(hash).toString(36).substring(0, 12);
}

