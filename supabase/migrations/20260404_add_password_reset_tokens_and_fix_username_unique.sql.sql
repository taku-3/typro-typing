begin;

-- =========================================================
-- 1) credentials.username の unique を
--    lower(username) から username 完全一致へ変更
-- =========================================================

drop index if exists public.credentials_username_unique_lower;

create unique index if not exists credentials_username_unique
  on public.credentials (username);

-- =========================================================
-- 2) password_reset_tokens テーブル作成
-- =========================================================

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  email_id uuid not null references public.emails(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),

  -- 監査・将来のレート制限/調査用（任意だが入れておく）
  requested_ip inet null,
  used_ip inet null
);

-- =========================================================
-- 3) index
-- =========================================================

create index if not exists password_reset_tokens_player_id_idx
  on public.password_reset_tokens (player_id);

create index if not exists password_reset_tokens_email_id_idx
  on public.password_reset_tokens (email_id);

create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens (expires_at);

create index if not exists password_reset_tokens_created_at_idx
  on public.password_reset_tokens (created_at desc);

create unique index if not exists password_reset_tokens_token_hash_idx
  on public.password_reset_tokens (token_hash);

-- 未使用トークンを探しやすくする
create index if not exists password_reset_tokens_unused_player_idx
  on public.password_reset_tokens (player_id, created_at desc)
  where used_at is null;

-- =========================================================
-- 4) 基本チェック制約
-- =========================================================

alter table public.password_reset_tokens
  add constraint password_reset_tokens_expires_after_created_chk
  check (expires_at > created_at);

commit;