-- À exécuter dans Supabase SQL Editor (une fois)
-- Permet de lier une carte cadeau aux fiches clients (ventes additionnelles à l’achat et à l’utilisation).

alter table public.gift_cards add column if not exists buyer_email text;
alter table public.gift_cards add column if not exists recipient_email text;

comment on column public.gift_cards.buyer_email is 'E-mail acheteur (saisi via le sélecteur client) pour MAJ fiches / ventes additionnelles';
comment on column public.gift_cards.recipient_email is 'E-mail bénéficiaire pour MAJ fiche à l’utilisation';
