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
  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS sécurisé
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = origin || '';
  
  if (allowedOrigins.includes(requestOrigin) || !process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = {
  getAllowedOrigins,
  setSecurityHeaders
};

