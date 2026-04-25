-- À exécuter une fois dans Supabase : SQL Editor → New query → Run
-- Montant facturable saisi côté admin (€). NULL = utiliser le prix de la prestation.

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS session_amount_eur numeric(10, 2);

COMMENT ON COLUMN public.appointments.session_amount_eur IS
  'Montant de la séance pour ce RDV (€). NULL = prix issu de la table prestations.';
