-- password reset token hardening
-- Step 1: DB schema only

create extension if not exists pgcrypto;

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  email_id uuid not null references public.emails(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  requested_ip text null,
  requested_user_agent text null,
  used_ip text null,
  used_user_agent text null
);

alter table public.password_reset_tokens
  alter column id set default gen_random_uuid();

alter table public.password_reset_tokens
  alter column player_id set not null;

alter table public.password_reset_tokens
  alter column email_id set not null;

alter table public.password_reset_tokens
  alter column token_hash set not null;

alter table public.password_reset_tokens
  alter column expires_at set not null;

alter table public.password_reset_tokens
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists requested_ip text null,
  add column if not exists requested_user_agent text null,
  add column if not exists used_ip text null,
  add column if not exists used_user_agent text null;

create unique index if not exists password_reset_tokens_token_hash_key
  on public.password_reset_tokens (token_hash);

create index if not exists password_reset_tokens_player_id_idx
  on public.password_reset_tokens (player_id);

create index if not exists password_reset_tokens_email_id_idx
  on public.password_reset_tokens (email_id);

create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens (expires_at);

create index if not exists password_reset_tokens_used_at_idx
  on public.password_reset_tokens (used_at);

create index if not exists password_reset_tokens_player_unused_idx
  on public.password_reset_tokens (player_id, used_at, expires_at);

comment on table public.password_reset_tokens is
  'Password reset tokens for custom auth. Raw token must never be stored.';

comment on column public.password_reset_tokens.token_hash is
  'Hashed reset token only. Never store raw token.';

comment on column public.password_reset_tokens.requested_ip is
  'IP address observed when reset email was requested.';

comment on column public.password_reset_tokens.requested_user_agent is
  'User-Agent observed when reset email was requested.';

comment on column public.password_reset_tokens.used_ip is
  'IP address observed when token was consumed.';

comment on column public.password_reset_tokens.used_user_agent is
  'User-Agent observed when token was consumed.';