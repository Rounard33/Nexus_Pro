import {createClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {applyRateLimit, setSecurityHeaders} from '../api/utils/security-helpers.js';

export async function handleAvailableSlots(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string;
  
  // Note: Les headers CORS sont déjà définis dans le routeur principal (api/index.ts)
  // Vérifier et créer le client Supabase dans le handler
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[AVAILABLE-SLOTS] Missing env vars:', {
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
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Rate limiting : 100 requêtes GET par minute
  if (!applyRateLimit(req, res, 100)) {
    return;
  }
  
  setSecurityHeaders(res, origin);

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
        console.error('[AVAILABLE-SLOTS] Supabase error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des créneaux',
          details: error.message,
          code: error.code
        });
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[AVAILABLE-SLOTS] Handler error:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

