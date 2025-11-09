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

/**
 * Routeur principal pour toutes les routes API
 * Consolide toutes les fonctions API en une seule Serverless Function
 * 
 * Toutes les routes /api/* sont redirigées vers cette fonction via vercel.json
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extraire le chemin de la requête
  // Avec le rewrite /api/(.*) -> /api/index?path=$1, le chemin original est dans req.query.path
  let path = req.url || '';
  
  // Récupérer le chemin original depuis le query param (passé par le rewrite)
  const pathParam = req.query['path'] as string;
  if (pathParam) {
    path = `/api/${pathParam}`;
  } else {
    // Fallback : utiliser req.url directement si pas de rewrite
    path = path.split('?')[0];
  }
  
  // S'assurer que le chemin commence par /api/
  if (!path.startsWith('/api/')) {
    path = `/api${path}`;
  }
  
  // Enlever les query params du chemin final
  path = path.split('?')[0];
  
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

