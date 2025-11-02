import {createClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {rateLimitMiddleware} from './utils/rate-limiter.js';
import {setCORSHeaders} from './utils/security-helpers.js';

// Domaines autorisés pour CORS (identique aux autres routes)
function getAllowedOrigins(): string[] {
  const origins = process.env['ALLOWED_ORIGINS']?.split(',') || [];
  const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];
  
  if (isDevelopment) {
    return [...origins, 'http://localhost:4200', 'http://localhost:3000'];
  }
  
  return origins.filter(origin => origin.trim().length > 0);
}

function setSecurityHeaders(res: VercelResponse, origin?: string): void {
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
    "connect-src 'self' https://*.supabase.co",
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string;
  
  // ⚠️ IMPORTANT : Définir les headers CORS EN PREMIER, avant toute vérification
  setCORSHeaders(res, origin, 'GET, OPTIONS', 'Content-Type');
  
  // Gérer les requêtes OPTIONS (preflight) immédiatement
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Vérifier et créer le client Supabase dans le handler
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[BLOCKED-DATES] Missing env vars:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      nodeEnv: process.env['NODE_ENV']
    });
    // Les headers CORS sont déjà définis, donc l'erreur sera visible
    return res.status(500).json({ 
      error: 'Configuration serveur incomplète',
      message: 'Variables d\'environnement Supabase manquantes'
    });
  }

  // Créer le client maintenant que nous savons que les variables existent
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  
  // Rate limiting : 100 requêtes GET par minute
  const rateLimit = rateLimitMiddleware(req, 100, 60000);
  
  // Ajouter les headers de rate limiting
  Object.entries(rateLimit.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Vérifier si la requête est autorisée
  if (!rateLimit.allowed) {
    const resetTimeStr = rateLimit.headers['X-RateLimit-Reset'];
    const resetTime = new Date(resetTimeStr).getTime();
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', Math.max(1, retryAfter).toString());
    return res.status(429).json({
      error: 'Trop de requêtes',
      message: 'Limite de 100 requêtes par minute dépassée',
      retryAfter: Math.max(1, retryAfter)
    });
  }
  
  setSecurityHeaders(res, origin);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('blocked_dates')
        .select('*')
        .gte('blocked_date', new Date().toISOString().split('T')[0])
        .order('blocked_date', { ascending: true });

      if (error) {
        console.error('[BLOCKED-DATES] Supabase error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des dates bloquées',
          details: error.message,
          code: error.code
        });
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[BLOCKED-DATES] Handler error:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}