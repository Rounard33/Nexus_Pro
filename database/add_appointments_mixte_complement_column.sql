-- À exécuter une fois dans Supabase : SQL Editor → New query → Run
-- Corrige : Could not find the 'mixte_complement_payment_method' column of 'appointments'

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS mixte_complement_payment_method text;

COMMENT ON COLUMN public.appointments.mixte_complement_payment_method IS
  'Moyen de paiement du complément (espèces, carte, virement, chèque) lorsque payment_method = mixte';

-- Valeurs attendues côté app : espèces | carte | virement | chèque | NULL
