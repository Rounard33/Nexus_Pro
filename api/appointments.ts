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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET : Récupérer les rendez-vous
  if (req.method === 'GET') {
    try {
      const { status, startDate, endDate } = req.query;

      let query = supabase.from('appointments').select('*, prestations(name)');

      if (status) {
        query = query.eq('status', status);
      }

      if (startDate && endDate) {
        query = query.gte('appointment_date', startDate as string)
                     .lte('appointment_date', endDate as string);
      }

      query = query.order('appointment_date', { ascending: true })
                   .order('appointment_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
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
      // Vérifier qu'il n'y a pas déjà un RDV à cette date/heure
      const { appointment_date, appointment_time } = req.body;
      
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', appointment_date)
        .eq('appointment_time', appointment_time)
        .in('status', ['pending', 'accepted']);

      if (checkError) {
        console.error('Check error:', checkError);
        return res.status(500).json({ error: checkError.message });
      }

      if (existingAppointments && existingAppointments.length > 0) {
        return res.status(409).json({ error: 'Ce créneau est déjà réservé' });
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert([req.body])
        .select('*, prestations(name)')
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }

      // TODO: Envoyer un email de notification (avec Brevo)
      
      return res.status(201).json(data);
    } catch (error: any) {
      console.error('Server error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  // PATCH : Mettre à jour un rendez-vous (accepter/refuser)
  if (req.method === 'PATCH') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing appointment ID' });
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(req.body)
        .eq('id', id)
        .select('*, prestations(name)')
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
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