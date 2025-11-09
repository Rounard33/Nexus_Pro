import type {VercelRequest, VercelResponse} from '@vercel/node';
import {handleAbout} from '../handlers/about.js';
import {handleAppointments} from '../handlers/appointments.js';
import {handleAvailableSlots} from '../handlers/available-slots.js';
import {handleBlockedDates} from '../handlers/blocked-dates.js';
import {handleClients} from '../handlers/clients.js';
import {handleCreations} from '../handlers/creations.js';
import {handleFaqs} from '../handlers/faqs.js';
import {handleOpeningHours} from '../handlers/opening-hours.js';
import {handlePrestations} from '../handlers/prestations.js';
import {handleTestimonials} from '../handlers/testimonials.js';
import {setCORSHeaders, setSecurityHeaders} from './utils/security-helpers.js';

/**
 * Détermine l'origine CORS à autoriser
 * Si credentials sont activés, on ne peut pas utiliser '*', il faut une origine spécifique
 */
function getCORSOrigin(requestOrigin?: string): string {
  // Si une origine est fournie dans la requête, l'utiliser
  if (requestOrigin) {
    // Autoriser toutes les origines Vercel (preview deployments)
    if (requestOrigin.includes('.vercel.app') || requestOrigin.includes('localhost')) {
      return requestOrigin;
    }
    // Autoriser aussi les origines configurées dans ALLOWED_ORIGINS
    const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',').map(o => o.trim()).filter(o => o.length > 0) || [];
    if (allowedOrigins.length > 0 && allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    // Par défaut, autoriser l'origine de la requête si elle existe
    // (nécessaire car on utilise credentials = true, donc on ne peut pas utiliser '*')
    return requestOrigin;
  }
  
  // Si pas d'origine dans la requête, c'est probablement une requête same-origin
  // Dans ce cas, on peut utiliser '*' car CORS ne s'applique pas vraiment
  // Mais pour être sûr, on va quand même retourner '*' (même si avec credentials ça ne marchera pas)
  // En pratique, si pas d'origine, le navigateur ne vérifie pas CORS
  return '*';
}

/**
 * Routeur principal pour toutes les routes API (catch-all)
 * Consolide toutes les fonctions API en une seule Serverless Function
 * 
 * Le nom de fichier [...path].ts indique à Vercel qu'il s'agit d'un catch-all
 * qui capture toutes les routes /api/*
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ⚠️ CRITIQUE : Définir les headers CORS IMMÉDIATEMENT, avant TOUTE autre opération
  const origin = req.headers.origin as string;
  
  // Définir les headers CORS de manière explicite et simple
  // IMPORTANT: Si Access-Control-Allow-Credentials est 'true', on ne peut PAS utiliser '*'
  // Il faut utiliser l'origine spécifique de la requête, ou une liste d'origines autorisées
  const allowedOrigin = getCORSOrigin(origin);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Appeler aussi setCORSHeaders pour la logique avancée
  setCORSHeaders(res, origin, 'GET, POST, PATCH, OPTIONS', 'Content-Type, Authorization');
  
  // Gérer les requêtes OPTIONS (preflight) immédiatement
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  setSecurityHeaders(res, origin);
  
  // Extraire le chemin depuis req.query.path (catch-all route)
  // req.query.path sera un tableau : ['prestations'], ['opening-hours'], etc.
  // OU depuis req.url directement si le catch-all ne fonctionne pas
  let path = '/api/';
  
  // Essayer d'abord avec req.query.path (catch-all)
  const pathArray = req.query['path'] as string | string[] | undefined;
  if (pathArray) {
    if (Array.isArray(pathArray)) {
      path = `/api/${pathArray.join('/')}`;
    } else {
      path = `/api/${pathArray}`;
    }
  } else {
    // Fallback : utiliser req.url directement
    // Cela devrait fonctionner même si le catch-all n'est pas reconnu
    const url = req.url || '';
    path = url.split('?')[0];
    
    // Si le chemin ne commence pas par /api/, l'ajouter
    if (!path.startsWith('/api/')) {
      // Si c'est juste /api, garder tel quel
      if (path === '/api') {
        path = '/api/';
      } else {
        path = `/api${path.startsWith('/') ? '' : '/'}${path}`;
      }
    }
  }
  
  // Enlever les query params du chemin final
  path = path.split('?')[0];
  
  // Log pour déboguer (toujours activé pour voir ce qui se passe)
  console.log(`[API Router] Method: ${req.method}, Path: ${path}, Origin: ${origin}, URL: ${req.url}, Query:`, JSON.stringify(req.query));
  
  // Router vers le handler approprié
  if (path.includes('/api/appointments') || path === '/api/appointments') {
    return handleAppointments(req, res);
  }
  
  if (path.includes('/api/clients') || path === '/api/clients') {
    return handleClients(req, res);
  }
  
  if (path.includes('/api/prestations') || path === '/api/prestations') {
    return handlePrestations(req, res);
  }
  
  if (path.includes('/api/about') || path === '/api/about') {
    return handleAbout(req, res);
  }
  
  if (path.includes('/api/creations') || path === '/api/creations') {
    return handleCreations(req, res);
  }
  
  if (path.includes('/api/testimonials') || path === '/api/testimonials') {
    return handleTestimonials(req, res);
  }
  
  if (path.includes('/api/faqs') || path === '/api/faqs') {
    return handleFaqs(req, res);
  }
  
  if (path.includes('/api/opening-hours') || path === '/api/opening-hours') {
    return handleOpeningHours(req, res);
  }
  
  if (path.includes('/api/available-slots') || path === '/api/available-slots') {
    return handleAvailableSlots(req, res);
  }
  
  if (path.includes('/api/blocked-dates') || path === '/api/blocked-dates') {
    return handleBlockedDates(req, res);
  }
  
  // Route non trouvée
  return res.status(404).json({ 
    error: 'Route not found',
    message: `No handler found for path: ${path}`
  });
}

