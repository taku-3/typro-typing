alter table public.consents
add column if not exists terms_version integer not null default 1,
add column if not exists privacy_version integer not null default 1,
add column if not exists terms_accepted_at timestamptz not null default now(),
add column if not exists privacy_accepted_at timestamptz not null default now(),
add column if not exists parental_consent_at timestamptz null;
