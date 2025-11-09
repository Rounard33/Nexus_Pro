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
  // Extraire le chemin de la requête
  // Avec catch-all [...path], req.url contient le chemin complet
  const url = req.url || '';
  const path = url.split('?')[0]; // Enlever les query params
  
  // Router vers le handler approprié
  if (path.includes('/api/appointments')) {
    return handleAppointments(req, res);
  }
  
  if (path.includes('/api/clients')) {
    return handleClients(req, res);
  }
  
  if (path.includes('/api/prestations')) {
    return handlePrestations(req, res);
  }
  
  if (path.includes('/api/about')) {
    return handleAbout(req, res);
  }
  
  if (path.includes('/api/creations')) {
    return handleCreations(req, res);
  }
  
  if (path.includes('/api/testimonials')) {
    return handleTestimonials(req, res);
  }
  
  if (path.includes('/api/faqs')) {
    return handleFaqs(req, res);
  }
  
  if (path.includes('/api/opening-hours')) {
    return handleOpeningHours(req, res);
  }
  
  if (path.includes('/api/available-slots')) {
    return handleAvailableSlots(req, res);
  }
  
  if (path.includes('/api/blocked-dates')) {
    return handleBlockedDates(req, res);
  }
  
  // Route non trouvée
  return res.status(404).json({ 
    error: 'Route not found',
    message: `No handler found for path: ${path}`
  });
}

