create extension if not exists pgcrypto;

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  email text not null,
  is_primary boolean not null default true,
  verified_at timestamptz null
);