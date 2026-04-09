create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  icon_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  username text not null,
  password_hash text not null,
  birth_year integer,
  birth_month integer,
  created_at timestamptz not null default now()
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  parental_consent boolean not null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  email text not null,
  is_primary boolean not null default true,
  verified_at timestamptz null,
  created_at timestamptz not null default now()
);

create unique index if not exists credentials_username_unique_lower
  on public.credentials (lower(username));

create unique index if not exists emails_player_email_unique_lower
  on public.emails (player_id, lower(email));

create unique index if not exists emails_one_primary_per_player
  on public.emails (player_id)
  where is_primary = true;

create index if not exists credentials_player_id_idx
  on public.credentials (player_id);

create index if not exists consents_player_id_idx
  on public.consents (player_id);

create index if not exists emails_player_id_idx
  on public.emails (player_id);