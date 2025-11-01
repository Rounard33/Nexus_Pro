import {createClient} from '@supabase/supabase-js';
import type {VercelRequest, VercelResponse} from '@vercel/node';

const supabase = createClient(
   process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('creations')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}