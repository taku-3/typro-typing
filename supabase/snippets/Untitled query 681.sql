create table if not exists public.leaderboard_public_cache (
  period_type text not null,
  period_start date not null,

  mode text not null,
  theme_id text not null,
  level text not null,
  case_mode text not null,
  duration_sec int not null,

  player_id uuid not null,

  best_score int not null,
  first_achieved_at timestamptz not null,
  updated_at timestamptz not null default now(),

  primary key (
    period_type,
    period_start,
    mode,
    theme_id,
    level,
    case_mode,
    duration_sec,
    player_id
  )
);

create index if not exists leaderboard_cache_rank_idx
  on public.leaderboard_public_cache
  (
    period_type,
    period_start,
    mode,
    theme_id,
    level,
    case_mode,
    duration_sec,
    best_score desc,
    first_achieved_at asc
  );