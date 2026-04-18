-- Cartes cadeaux (admin) — à exécuter une fois dans Supabase SQL Editor
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  recipient_name text not null,
  purchase_date date not null,
  valid_until date not null,
  service_label text not null,
  used boolean not null default false,
  notes text,
  buyer_email text,
  recipient_email text,
  created_at timestamptz not null default now()
);

create index if not exists gift_cards_purchase_date_idx on public.gift_cards (purchase_date desc);
create index if not exists gift_cards_used_idx on public.gift_cards (used);

comment on table public.gift_cards is 'Cartes cadeaux enregistrées depuis le panneau admin';
