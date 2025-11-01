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
      const { data, error } = await supabase
        .from('about_content')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) {
        const isDevelopment = process.env['NODE_ENV'] === 'development';
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération du contenu',
          ...(isDevelopment && { details: error.message })
        });
      }
      
      return res.json(data);
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