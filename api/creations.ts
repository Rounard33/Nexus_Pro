import {createClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';
import {applyRateLimit, setCORSHeaders, setSecurityHeaders} from './utils/security-helpers';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const origin = req.headers.origin as string;
  
  // ⚠️ IMPORTANT : Définir les headers CORS EN PREMIER, avant toute vérification
  setCORSHeaders(res, origin, 'GET, OPTIONS', 'Content-Type');
  
  // Gérer les requêtes OPTIONS (preflight) immédiatement
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Vérifier et créer le client Supabase dans le handler
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[CREATIONS] Missing env vars:', {
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
        .from('creations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('[CREATIONS] Supabase error:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des créations',
          details: error.message,
          code: error.code
        });
      }
      
      return res.json(data);
    } catch (error: any) {
      console.error('[CREATIONS] Handler error:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}