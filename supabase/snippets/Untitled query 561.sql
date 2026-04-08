create table players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  icon_url text,
  created_at timestamptz default now()
);

create table credentials (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  username text unique not null,
  password_hash text not null
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  parental_consent boolean not null,
  consented_at timestamptz not null
);