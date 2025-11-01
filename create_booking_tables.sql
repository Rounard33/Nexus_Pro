-- =====================================================
-- Script SQL pour créer les tables de réservation
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Table pour les créneaux disponibles
CREATE TABLE IF NOT EXISTS available_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table pour les dates bloquées
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table pour les rendez-vous
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  prestation_id UUID REFERENCES prestations(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les triggers existants s'ils existent
DROP TRIGGER IF EXISTS update_available_slots_timestamp ON available_slots;
DROP TRIGGER IF EXISTS update_blocked_dates_timestamp ON blocked_dates;
DROP TRIGGER IF EXISTS update_appointments_timestamp ON appointments;

-- Créer les triggers
CREATE TRIGGER update_available_slots_timestamp
  BEFORE UPDATE ON available_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_blocked_dates_timestamp
  BEFORE UPDATE ON blocked_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_timestamp
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Available slots are viewable by everyone" ON available_slots;
DROP POLICY IF EXISTS "Blocked dates are viewable by everyone" ON blocked_dates;
DROP POLICY IF EXISTS "Appointments are viewable by everyone" ON appointments;
DROP POLICY IF EXISTS "Only admins can modify available slots" ON available_slots;
DROP POLICY IF EXISTS "Only admins can modify blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
DROP POLICY IF EXISTS "Only admins can modify appointments" ON appointments;

-- Politiques : Tout le monde peut lire
CREATE POLICY "Available slots are viewable by everyone"
  ON available_slots FOR SELECT
  USING (true);

CREATE POLICY "Blocked dates are viewable by everyone"
  ON blocked_dates FOR SELECT
  USING (true);

CREATE POLICY "Appointments are viewable by everyone"
  ON appointments FOR SELECT
  USING (true);

-- Politiques : Seuls les admins peuvent modifier (si table admin existe)
-- Sinon, tout le monde peut modifier pour le moment
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin') THEN
    CREATE POLICY "Only admins can modify available slots"
      ON available_slots FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM admin
          WHERE admin.id = auth.uid()
        )
      );

    CREATE POLICY "Only admins can modify blocked dates"
      ON blocked_dates FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM admin
          WHERE admin.id = auth.uid()
        )
      );

    CREATE POLICY "Only admins can modify appointments"
      ON appointments FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM admin
          WHERE admin.id = auth.uid()
        )
      );
  ELSE
    -- Si pas de table admin, permettre les modifications pour tous
    CREATE POLICY "Anyone can modify available slots"
      ON available_slots FOR ALL
      USING (true);

    CREATE POLICY "Anyone can modify blocked dates"
      ON blocked_dates FOR ALL
      USING (true);

    CREATE POLICY "Anyone can modify appointments"
      ON appointments FOR ALL
      USING (true);
  END IF;
END $$;

-- N'importe qui peut créer un rendez-vous
CREATE POLICY "Anyone can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

-- Insérer des créneaux de base (exemple)
-- Lundi (1)
INSERT INTO available_slots (day_of_week, start_time, end_time) VALUES
  (1, '09:00', '13:00'), -- Lundi matin
  (1, '14:00', '17:00') -- Lundi après-midi
ON CONFLICT DO NOTHING;

-- Mardi (2)
INSERT INTO available_slots (day_of_week, start_time, end_time) VALUES
  (2, '09:00', '13:00'), -- Mardi matin
  (2, '14:00', '17:00') -- Mardi après-midi
ON CONFLICT DO NOTHING;

-- Mercredi (3)
INSERT INTO available_slots (day_of_week, start_time, end_time) VALUES
  (3, '09:00', '13:00'), -- Mercredi matin
  (3, '14:00', '19:30') -- Mercredi après-midi
ON CONFLICT DO NOTHING;

-- Jeudi (4)
INSERT INTO available_slots (day_of_week, start_time, end_time) VALUES
  (4, '09:00', '13:00'), -- Jeudi matin
  (4, '14:00', '17:00') -- Jeudi après-midi
ON CONFLICT DO NOTHING;

-- Vendredi (5)
INSERT INTO available_slots (day_of_week, start_time, end_time) VALUES
  (5, '09:00', '13:00'), -- Vendredi matin
  (5, '14:00', '19:30') -- Vendredi après-midi
ON CONFLICT DO NOTHING;

-- Samedi (6)
INSERT INTO available_slots (day_of_week, start_time, end_time) VALUES
  (6, '09:00', '13:00') -- Samedi matin
ON CONFLICT DO NOTHING;

-- Vérifier que les tables sont créées
SELECT 'Tables créées avec succès!' as message;

