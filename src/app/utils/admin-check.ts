/**
 * Utilitaires pour vérifier les droits administrateur
 */

export interface AdminCheckResult {
  isAdmin: boolean;
  error?: string;
}

/**
 * Vérifie si un utilisateur est administrateur
 * Note: Cette fonction doit être appelée côté serveur avec le token utilisateur
 */
export async function checkAdminAccess(userId: string, supabaseClient: any): Promise<AdminCheckResult> {
  try {
    // Vérifier si l'utilisateur existe dans la table admin
    const { data: adminUser, error } = await supabaseClient
      .from('admin')
      .select('id')
      .eq('id', userId)
      .single();

    if (error) {
      // Si la table n'existe pas, on considère que l'utilisateur authentifié est admin
      // (pour compatibilité si la table admin n'a pas encore été créée)
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return { isAdmin: true }; // Fallback: si pas de table admin, auth = admin
      }
      
      return { isAdmin: false, error: error.message };
    }

    return { isAdmin: !!adminUser };
  } catch (error: any) {
    return { isAdmin: false, error: error.message || 'Erreur lors de la vérification' };
  }
}

