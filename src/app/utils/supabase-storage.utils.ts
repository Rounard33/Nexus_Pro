import {environment} from '../../environments/environment';

/**
 * Construit l'URL publique d'un fichier dans Supabase Storage
 * @param bucketName Nom du bucket (ex: 'prestations', 'creations')
 * @param filePath Chemin du fichier dans le bucket (ex: 'image1.jpg' ou 'folder/image1.jpg')
 * @returns URL publique complète
 */
export function getSupabaseStorageUrl(bucketName: string, filePath: string): string {
  if (!filePath) {
    return '';
  }
  
  // Si c'est déjà une URL complète, la retourner telle quelle
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Construire l'URL Supabase Storage publique
  const supabaseUrl = environment.supabaseUrl;
  // Enlever le trailing slash si présent
  const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
  
  // Nettoyer le chemin du fichier (enlever le slash initial si présent)
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  return `${baseUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`;
}

/**
 * Construit l'URL publique d'une image de prestation
 * @param imagePath Chemin de l'image dans le bucket 'prestations'
 * @returns URL publique complète
 */
export function getPrestationImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    return '';
  }
  return getSupabaseStorageUrl('prestations', imagePath);
}

/**
 * Construit l'URL publique d'une image de création
 * @param imagePath Chemin de l'image dans le bucket 'creations'
 * @returns URL publique complète
 */
export function getCreationImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    return '';
  }
  return getSupabaseStorageUrl('creations', imagePath);
}

/**
 * Construit l'URL publique d'un avatar de témoignage
 * @param avatarPath Chemin de l'avatar dans le bucket 'testimonials' ou 'avatars'
 * @returns URL publique complète
 */
export function getTestimonialAvatarUrl(avatarPath: string | null | undefined): string {
  if (!avatarPath) {
    return '';
  }
  // Essayer d'abord 'testimonials', puis 'avatars'
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  return getSupabaseStorageUrl('testimonials', avatarPath);
}

/**
 * Construit l'URL publique d'une image de la section About
 * @param imagePath Chemin de l'image dans le bucket 'about' ou 'images'
 * @returns URL publique complète
 */
export function getAboutImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    return '';
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Essayer d'abord 'about', puis 'images'
  return getSupabaseStorageUrl('about', imagePath);
}

