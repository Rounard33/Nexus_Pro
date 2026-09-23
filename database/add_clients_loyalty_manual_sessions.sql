-- À exécuter une fois dans Supabase : SQL Editor → New query → Run
-- Séances ajoutées manuellement sur la carte fidélité (admin).

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS loyalty_manual_sessions integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.clients.loyalty_manual_sessions IS
  'Points fidélité ajoutés manuellement par l''admin (s''ajoutent aux séances terminées et parrainages).';

ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_loyalty_manual_sessions_nonneg;

ALTER TABLE public.clients
ADD CONSTRAINT clients_loyalty_manual_sessions_nonneg
CHECK (loyalty_manual_sessions >= 0 AND loyalty_manual_sessions <= 10);
