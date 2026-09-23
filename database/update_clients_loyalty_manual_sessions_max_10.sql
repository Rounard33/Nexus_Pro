-- Si la colonne existe déjà avec une limite à 999, exécuter ceci pour plafonner à 10.

UPDATE public.clients
SET loyalty_manual_sessions = 0
WHERE loyalty_manual_sessions > 10;

ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_loyalty_manual_sessions_nonneg;

ALTER TABLE public.clients
ADD CONSTRAINT clients_loyalty_manual_sessions_nonneg
CHECK (loyalty_manual_sessions >= 0 AND loyalty_manual_sessions <= 10);
