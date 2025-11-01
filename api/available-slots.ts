import {createClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {applyRateLimit, setSecurityHeaders} from './utils/security-helpers';

const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string;
  
  // Rate limiting : 100 requêtes GET par minute
  if (!applyRateLimit(req, res, 100)) {
    return;
  }
  
  setSecurityHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { day_of_week } = req.query;
      
      // Validation du paramètre day_of_week
      if (day_of_week && (typeof day_of_week !== 'string' || isNaN(parseInt(day_of_week)))) {
        return res.status(400).json({ error: 'Invalid day_of_week parameter' });
      }

      let query = supabase
        .from('available_slots')
        .select('*')
        .eq('is_active', true);

      if (day_of_week && typeof day_of_week === 'string') {
        const dayNum = parseInt(day_of_week);
        if (dayNum >= 0 && dayNum <= 6) {
          query = query.eq('day_of_week', dayNum);
        } else {
          return res.status(400).json({ error: 'day_of_week must be between 0 and 6' });
        }
      }

      query = query.order('day_of_week', { ascending: true })
                   .order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        const isDevelopment = process.env['NODE_ENV'] === 'development';
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des créneaux',
          ...(isDevelopment && { details: error.message })
        });
      }

      return res.status(200).json(data);
    } catch (error: any) {
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        ...(isDevelopment && { details: error.message })
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}