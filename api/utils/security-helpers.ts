/**
 * Utilitaires de sécurité communs pour toutes les routes API
 */

import type {VercelResponse} from '@vercel/node';
import {rateLimitMiddleware} from './rate-limiter';

// Domaines autorisés pour CORS
export function getAllowedOrigins(): string[] {
  const origins = process.env['ALLOWED_ORIGINS']?.split(',') || [];
  const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];
  
  if (isDevelopment) {
    return [...origins, 'http://localhost:4200', 'http://localhost:3000'];
  }
  
  return origins.filter(origin => origin.trim().length > 0);
}

export function setSecurityHeaders(res: VercelResponse, origin?: string): void {
  // Headers de sécurité de base
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // CORS sécurisé
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = origin || '';
  
  if (allowedOrigins.includes(requestOrigin) || process.env['NODE_ENV'] === 'development') {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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

