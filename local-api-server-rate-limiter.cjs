/**
 * Rate limiting utility pour le serveur API local
 */

// Stockage en mémoire simple
const store = {};

// Nettoyage périodique
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
 */
function checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
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
function getIdentifier(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const ip = forwarded 
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0])
    : realIp || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
  
  return ip;
}

/**
 * Applique le rate limiting à une requête
 */
function applyRateLimit(req, res, maxRequests = 100, windowMs = 60000) {
  const identifier = getIdentifier(req);
  const result = checkRateLimit(identifier, maxRequests, windowMs);

  // Ajouter les headers
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  if (!result.allowed) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
    });
    res.end(JSON.stringify({
      error: 'Trop de requêtes',
      message: `Limite de ${maxRequests} requêtes par ${Math.floor(windowMs / 1000)} secondes dépassée`,
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    }));
    return false;
  }

  return true;
}

module.exports = {
  applyRateLimit,
  getIdentifier,
  checkRateLimit
};

