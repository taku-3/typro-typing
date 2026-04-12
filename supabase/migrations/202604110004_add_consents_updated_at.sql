alter table public.consents
add column if not exists updated_at timestamptz not null default now();