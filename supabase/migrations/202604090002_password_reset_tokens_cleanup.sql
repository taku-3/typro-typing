-- cleanup for password_reset_tokens
-- remove legacy column and duplicate unique index

alter table public.password_reset_tokens
  drop column if exists user_agent;

drop index if exists public.password_reset_tokens_token_hash_idx;