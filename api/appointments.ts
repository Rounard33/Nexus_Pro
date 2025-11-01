import {createClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {sanitizeAppointment, validateAppointment, validateAppointmentQuery} from './utils/validation';

const supabaseAdmin = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

// Fonction pour vérifier l'authentification et les droits admin
async function verifyAuth(req: VercelRequest): Promise<{authenticated: boolean; isAdmin?: boolean; user?: any; error?: string}> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {authenticated: false, error: 'Missing or invalid authorization header'};
  }

  const token = authHeader.substring(7); // Enlever "Bearer "

  try {
    // Utiliser le client admin pour vérifier le token
    const {data: {user}, error} = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return {authenticated: false, error: 'Invalid token'};
    }

    // Vérifier si l'utilisateur est admin
    try {
      const { data: adminUser, error: adminError } = await supabaseAdmin
        .from('admin')
        .select('id')
        .eq('id', user.id)
        .single();

      // Si la table admin n'existe pas, considérer l'utilisateur authentifié comme admin (fallback)
      if (adminError && (adminError.code === 'PGRST116' || adminError.message?.includes('does not exist'))) {
        console.warn('⚠️ Table admin n\'existe pas, utilisateur authentifié considéré comme admin');
        return {authenticated: true, isAdmin: true, user};
      }

      const isAdmin = !!adminUser && !adminError;

      return {
        authenticated: true,
        isAdmin,
        user,
        ...(!isAdmin && { error: 'User is not an admin' })
      };
    } catch (adminCheckError: any) {
      // Erreur lors de la vérification admin - refuser l'accès par sécurité
      return {authenticated: true, isAdmin: false, user, error: 'Unable to verify admin status'};
    }
  } catch (error: any) {
    return {authenticated: false, error: error.message || 'Authentication failed'};
  }
}

// Domaines autorisés pour CORS
function getAllowedOrigins(): string[] {
  const origins = process.env['ALLOWED_ORIGINS']?.split(',') || [];
  const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];
  
  if (isDevelopment) {
    return [...origins, 'http://localhost:4200', 'http://localhost:3000'];
  }
  
  return origins.filter(origin => origin.trim().length > 0);
}

function setSecurityHeaders(res: VercelResponse, origin?: string): void {
  // Headers de sécurité
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS sécurisé
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = origin || '';
  
  if (allowedOrigins.includes(requestOrigin) || process.env['NODE_ENV'] === 'development') {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string;
  setSecurityHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET : Récupérer les rendez-vous
  if (req.method === 'GET') {
    try {
      const { status, startDate, endDate } = req.query;

      // Valider les paramètres de requête
      const queryValidation = validateAppointmentQuery({ status, startDate, endDate });
      if (!queryValidation.valid) {
        return res.status(400).json({ error: 'Paramètres invalides', details: queryValidation.errors });
      }

      let query = supabaseAdmin.from('appointments').select(`
        *,
        prestations (
          name
        )
      `);

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
        query = query.gte('appointment_date', startDate)
                     .lte('appointment_date', endDate);
      }

      query = query.order('appointment_date', { ascending: true })
                   .order('appointment_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }

      // Ne pas logger les données sensibles en production
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      if (isDevelopment && data && data.length > 0) {
        console.log('Sample appointment with prestation:', JSON.stringify(data[0], null, 2));
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('Server error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  // POST : Créer un rendez-vous
  if (req.method === 'POST') {
    try {
      // Valider les données d'entrée
      const validation = validateAppointment(req.body);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Données invalides',
          details: validation.errors
        });
      }

      // Nettoyer et normaliser les données
      const sanitizedData = sanitizeAppointment(req.body);

      // Vérifier qu'il n'y a pas déjà un RDV à cette date/heure
      const { appointment_date, appointment_time } = sanitizedData;
      
      const { data: existingAppointments, error: checkError } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('appointment_date', appointment_date)
        .eq('appointment_time', appointment_time)
        .in('status', ['pending', 'accepted']);

      if (checkError) {
        console.error('Check error:', checkError);
        const isDevelopment = process.env['NODE_ENV'] === 'development';
        return res.status(500).json({ 
          error: 'Erreur lors de la vérification des créneaux',
          ...(isDevelopment && { details: checkError.message })
        });
      }

      if (existingAppointments && existingAppointments.length > 0) {
        return res.status(409).json({ error: 'Ce créneau est déjà réservé' });
      }

      // Insérer uniquement les champs autorisés et validés
      const { data, error } = await supabaseAdmin
        .from('appointments')
        .insert([sanitizedData])
        .select(`
          *,
          prestations (
            name
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        const isDevelopment = process.env['NODE_ENV'] === 'development';
        return res.status(500).json({ 
          error: 'Erreur lors de la création du rendez-vous',
          ...(isDevelopment && { details: error.message })
        });
      }

      // TODO: Envoyer un email de notification (avec Brevo)
      
      return res.status(201).json(data);
    } catch (error: any) {
      console.error('Server error:', error);
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        ...(isDevelopment && { details: error.message })
      });
    }
  }

  // PATCH : Mettre à jour un rendez-vous (accepter/refuser) - PROTÉGÉ
  if (req.method === 'PATCH') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing appointment ID' });
    }

    // Vérifier l'authentification et les droits admin
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!auth.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    try {
      // Nettoyer le body pour ne garder que les champs autorisés
      const updateData: any = {
        status: req.body.status?.toLowerCase()?.trim()
      };
      
      if (req.body.notes !== undefined && req.body.notes !== null) {
        updateData.notes = req.body.notes;
      }

      // Vérifier que le statut est valide
      const validStatuses = ['pending', 'accepted', 'rejected', 'cancelled'];
      if (!updateData.status || !validStatuses.includes(updateData.status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      const isDevelopment = process.env['NODE_ENV'] === 'development';
      if (isDevelopment) {
        console.log('Updating appointment:', id, 'with data:', updateData);
      }

      const { data, error } = await supabaseAdmin
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          prestations (
            name
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        if (isDevelopment) {
          console.error('Error details:', JSON.stringify(error, null, 2));
        }
        return res.status(500).json({ 
          error: 'Erreur lors de la mise à jour',
          ...(isDevelopment && { details: error.message })
        });
      }

      // TODO: Envoyer un email au client (avec Brevo)
      
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('Server error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}