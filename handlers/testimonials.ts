import {createClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {applyRateLimit, setSecurityHeaders} from '../api/utils/security-helpers.js';

export async function handleTestimonials(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string;
  
  // Note: Les headers CORS sont déjà définis dans le routeur principal (api/index.ts)
  // Vérifier et créer le client Supabase dans le handler
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[TESTIMONIALS] Missing env vars:', {
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
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('[TESTIMONIALS] Supabase error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des témoignages',
          details: error.message,
          code: error.code
        });
      }
      
      return res.json(data);
    } catch (error: any) {
      console.error('[TESTIMONIALS] Handler error:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

