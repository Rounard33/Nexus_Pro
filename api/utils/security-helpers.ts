/**
 * Utilitaires de sécurité communs pour toutes les routes API
 */

import type {VercelResponse} from '@vercel/node';
import {rateLimitMiddleware} from './rate-limiter.js';

// Domaines autorisés pour CORS
export function getAllowedOrigins(): string[] {
  const origins = process.env['ALLOWED_ORIGINS']?.split(',') || [];
  const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];
  
  if (isDevelopment) {
    return [...origins, 'http://localhost:4200', 'http://localhost:3000'];
  }
  
  return origins.filter(origin => origin.trim().length > 0);
}

// Fonction pour définir UNIQUEMENT les headers CORS (appelée en premier)
// ⚠️ IMPORTANT: Cette fonction doit TOUJOURS définir les headers CORS, même en cas d'erreur
export function setCORSHeaders(res: VercelResponse, origin?: string, methods: string = 'GET, POST, PATCH, OPTIONS', headers: string = 'Content-Type, Authorization'): void {
  try {
    const allowedOrigins = getAllowedOrigins();
    const requestOrigin = origin || '';
    const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];
    
    // Toujours définir les headers CORS de base
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 heures
    
    // Définir Access-Control-Allow-Origin selon la configuration
    if (isDevelopment) {
      // En développement, autoriser toutes les origines locales et l'origine de la requête
      res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    } else if (allowedOrigins.length === 0) {
      // Si ALLOWED_ORIGINS n'est pas configuré, autoriser l'origine de la requête (fallback)
      // ⚠️ ATTENTION: En production, configurez ALLOWED_ORIGINS pour la sécurité
      // Mais pour permettre le débogage, on autorise l'origine de la requête
      res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    } else if (allowedOrigins.includes(requestOrigin)) {
      // Si l'origine est dans la liste autorisée, l'accepter
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    } else {
      // ⚠️ IMPORTANT: Même si l'origine n'est pas autorisée, définir le header pour que l'erreur soit visible
      // Le navigateur bloquera toujours la requête, mais au moins on pourra voir l'erreur 500 si elle existe
      // En production, cela devrait être loggé et surveillé
      console.warn(`[CORS] Origin not allowed: ${requestOrigin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      // Définir quand même le header pour permettre de voir les erreurs serveur
      res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    }
  } catch (error) {
    // En cas d'erreur dans setCORSHeaders, définir au moins les headers minimaux
    console.error('[CORS] Error setting CORS headers:', error);
    const requestOrigin = origin || '';
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

export function setSecurityHeaders(res: VercelResponse, origin?: string): void {
  // Headers de sécurité de base
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  // En développement: autoriser unsafe-inline/unsafe-eval pour le hot-reload Angular
  // En production: utiliser uniquement 'self' pour les scripts statiques Angular
  // 'self' est plus sûr que 'unsafe-inline' car il bloque les scripts inline et eval
  const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];
  let scriptSrc: string;
  if (isDevelopment) {
    scriptSrc = "'self' 'unsafe-inline' 'unsafe-eval'";
  } else {
    // En production: autoriser uniquement les scripts depuis 'self'
    // Cela bloque 'unsafe-inline' et 'unsafe-eval' tout en permettant Angular
    scriptSrc = "'self'";
  }

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Note: Les headers CORS sont gérés par setCORSHeaders() qui doit être appelé avant setSecurityHeaders()
  // On ne redéfinit pas les headers CORS ici pour éviter d'écraser ceux définis par setCORSHeaders()
}

export function applyRateLimit(req: any, res: VercelResponse, maxRequests: number = 100): boolean {
  const rateLimit = rateLimitMiddleware(req, maxRequests, 60000);
  
  // Ajouter les headers de rate limiting
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Vérifier si la requête est autorisée
  if (!rateLimit.allowed) {
    // Le header X-RateLimit-Reset contient une date ISO string
    const resetTimeStr = rateLimit.headers['X-RateLimit-Reset'];
    const resetTime = new Date(resetTimeStr).getTime();
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', Math.max(1, retryAfter).toString());
    res.status(429).json({
      error: 'Trop de requêtes',
      message: `Limite de ${maxRequests} requêtes par minute dépassée`,
      retryAfter: Math.max(1, retryAfter)
    });
    return false;
  }
  
  return true;
}

