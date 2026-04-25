import {environment} from '../../environments/environment';

/** Bucket unique du projet (sous-dossiers : creations/, prestations/, about/, …) */
const SITE_MEDIA_BUCKET = 'site-media';

/**
 * Construit l'URL publique d'un fichier dans Supabase Storage
 * @param bucketName ID du bucket (souvent `site-media`)
 * @param filePath Chemin du fichier dans le bucket (ex: 'creations/photo.jpg')
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
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const clean = (imagePath.startsWith('/') ? imagePath.slice(1) : imagePath).replace(/^\/+/, '');
  if (clean.startsWith('prestations/')) {
    return getSupabaseStorageUrl(SITE_MEDIA_BUCKET, clean);
  }
  return getSupabaseStorageUrl(SITE_MEDIA_BUCKET, `prestations/${clean}`);
}

/**
 * Construit l'URL publique d'une image de création
 * (dossier `creations` dans le bucket `site-media`)
 */
export function getCreationImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    return '';
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const clean = (imagePath.startsWith('/') ? imagePath.slice(1) : imagePath).replace(/^\/+/, '');
  if (clean.startsWith('creations/')) {
    return getSupabaseStorageUrl(SITE_MEDIA_BUCKET, clean);
  }
  return getSupabaseStorageUrl(SITE_MEDIA_BUCKET, `creations/${clean}`);
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
  const clean = (imagePath.startsWith('/') ? imagePath.slice(1) : imagePath).replace(/^\/+/, '');
  if (clean.startsWith('about/')) {
    return getSupabaseStorageUrl(SITE_MEDIA_BUCKET, clean);
  }
  return getSupabaseStorageUrl(SITE_MEDIA_BUCKET, `about/${clean}`);
}

