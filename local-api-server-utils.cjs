// Utilitaires pour le serveur API local

/**
 * Domaines autorisés pour CORS
 */
function getAllowedOrigins() {
  const origins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(o => o.trim());
  const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return [...origins, 'http://localhost:4200', 'http://localhost:3000'];
  }
  
  return origins;
}

/**
 * Définit les headers de sécurité HTTP
 */
function setSecurityHeaders(res, origin) {
  // Headers de sécurité de base
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  
  // Content Security Policy
  // En développement: autoriser unsafe-inline/unsafe-eval pour le hot-reload Angular
  // En production: utiliser uniquement 'self' pour les scripts statiques Angular
  // 'self' est plus sûr que 'unsafe-inline' car il bloque les scripts inline et eval
  let scriptSrc;
  if (isDevelopment) {
    scriptSrc = "'self' 'unsafe-inline' 'unsafe-eval'";
  } else {
    // En production: autoriser uniquement les scripts depuis 'self'
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
    "object-src 'none'", // Bloque les plugins comme Flash
    "upgrade-insecure-requests" // Force HTTPS si disponible
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // CORS sécurisé
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = origin || '';
  
  if (allowedOrigins.includes(requestOrigin) || isDevelopment) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = {
  getAllowedOrigins,
  setSecurityHeaders
};

