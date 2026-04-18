create table public.matches (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_player_id uuid not null references public.players(id) on delete cascade,
  theme_id text not null,
  level text not null,
  case_mode text not null,
  duration_sec int not null default 60,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  constraint matches_level_check check (level in ('easy', 'normal', 'hard')),
  constraint matches_case_mode_check check (case_mode in ('lower', 'title', 'upper', 'mixed')),
  constraint matches_duration_sec_check check (duration_sec = 60),
  constraint matches_status_check check (status in ('waiting', 'canceled', 'playing', 'finished'))
);

create index matches_room_code_idx on public.matches (room_code);
create index matches_host_player_id_idx on public.matches (host_player_id);
create index matches_created_at_desc_idx on public.matches (created_at desc);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  constraint match_players_role_check check (role in ('host', 'guest')),
  constraint match_players_match_player_unique unique (match_id, player_id),
  constraint match_players_match_role_unique unique (match_id, role)
);

create index match_players_match_id_idx on public.match_players (match_id);
create index match_players_player_id_idx on public.match_players (player_id);
