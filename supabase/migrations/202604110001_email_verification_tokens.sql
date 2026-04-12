-- email verification tokens
-- Step 7: DB schema for email verification

create extension if not exists pgcrypto;

create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  email_id uuid not null references public.emails(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  requested_ip inet null,
  requested_user_agent text null,
  used_ip inet null,
  used_user_agent text null
);

create unique index if not exists email_verification_tokens_token_hash_key
  on public.email_verification_tokens (token_hash);

create index if not exists email_verification_tokens_player_id_idx
  on public.email_verification_tokens (player_id);

create index if not exists email_verification_tokens_email_id_idx
  on public.email_verification_tokens (email_id);

create index if not exists email_verification_tokens_expires_at_idx
  on public.email_verification_tokens (expires_at);

create index if not exists email_verification_tokens_used_at_idx
  on public.email_verification_tokens (used_at);

create index if not exists email_verification_tokens_player_unused_idx
  on public.email_verification_tokens (player_id, used_at, expires_at);

comment on table public.email_verification_tokens is
  'Email verification tokens for custom auth. Raw token must never be stored.';

comment on column public.email_verification_tokens.token_hash is
  'Hashed verification token only. Never store raw token.';

comment on column public.email_verification_tokens.requested_ip is
  'IP address observed when verification email was requested.';

comment on column public.email_verification_tokens.requested_user_agent is
  'User-Agent observed when verification email was requested.';

comment on column public.email_verification_tokens.used_ip is
  'IP address observed when verification token was consumed.';

comment on column public.email_verification_tokens.used_user_agent is
  'User-Agent observed when verification token was consumed.';