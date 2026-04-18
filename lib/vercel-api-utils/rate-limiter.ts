/**
 * Rate limiting utility pour protéger contre les attaques brute force et DDoS
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Stockage en mémoire (pour Vercel serverless, utiliser Redis en production)
const store: RateLimitStore = {};

// Nettoyage périodique des entrées expirées
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 60000); // Nettoyer toutes les minutes

/**
 * Vérifie et applique le rate limiting
 * @param identifier Identifiant unique (IP, userId, etc.)
 * @param maxRequests Nombre maximum de requêtes
 * @param windowMs Fenêtre de temps en millisecondes
 * @returns {allowed: boolean, remaining: number, resetTime: number}
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute par défaut
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  let entry = store[key];

  // Si pas d'entrée ou fenêtre expirée, créer une nouvelle
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs
    };
    store[key] = entry;
  }

  // Incrémenter le compteur
  entry.count++;

  const remaining = Math.max(0, maxRequests - entry.count);
  const allowed = entry.count <= maxRequests;

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime
  };
}

/**
 * Obtient l'identifiant depuis une requête (IP address)
 */
export function getIdentifier(req: any): string {
  // Pour Vercel, utiliser x-forwarded-for ou x-real-ip
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const ip = forwarded 
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0])
    : realIp || req.socket?.remoteAddress || 'unknown';
  
  return ip as string;
}

/**
 * Middleware de rate limiting pour Vercel
 * Retourne les headers à ajouter et un booléen indiquant si la requête est autorisée
 */
export function rateLimitMiddleware(
  req: any,
  maxRequests: number = 100,
  windowMs: number = 60000
): {
  allowed: boolean;
  headers: Record<string, string>;
} {
  const identifier = getIdentifier(req);
  const result = checkRateLimit(identifier, maxRequests, windowMs);

  const headers = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
  };

  return {
    allowed: result.allowed,
    headers
  };
}

