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
 * Routeur principal pour toutes les routes API (catch-all)
 * Consolide toutes les fonctions API en une seule Serverless Function
 * 
 * Le nom de fichier [...slug].ts indique à Vercel qu'il s'agit d'un catch-all
 * qui capture toutes les routes /api/*
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ⚠️ CRITIQUE : Définir les headers CORS EN PREMIER, avant TOUTE autre opération
  // Cela garantit que les headers CORS sont toujours présents, même en cas d'erreur
  const origin = req.headers.origin as string;
  setCORSHeaders(res, origin, 'GET, POST, PATCH, OPTIONS', 'Content-Type, Authorization');
  
  // Gérer les requêtes OPTIONS (preflight) immédiatement
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Définir les autres headers de sécurité
  setSecurityHeaders(res, origin);
  
  // Extraire le chemin de la requête
  // Avec catch-all [...slug], req.query.slug contient le chemin
  const slug = req.query['slug'] as string | string[];
  let path = '/api/';
  
  if (slug) {
    if (Array.isArray(slug)) {
      path = `/api/${slug.join('/')}`;
    } else {
      path = `/api/${slug}`;
    }
  } else {
    // Fallback : utiliser req.url
    const url = req.url || '';
    path = url.split('?')[0];
    if (!path.startsWith('/api/')) {
      path = `/api${path}`;
    }
  }
  
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

