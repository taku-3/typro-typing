-- =========================
-- scores（生ログ）
-- =========================
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  mode text not null,
  theme_id text not null,
  level text not null,
  case_mode text not null,
  duration_sec int not null,
  ended_at timestamptz not null,
  score int not null,
  accuracy int not null,
  speed_cps numeric not null,
  typed_chars int not null,
  mistyped_count int not null,
  rank_status text not null default 'ranked',
  flag_reason text,
  created_at timestamptz not null default now()
);

create index if not exists scores_player_id_idx
  on public.scores (player_id);

create index if not exists scores_ranking_idx
  on public.scores (
    mode,
    theme_id,
    level,
    case_mode,
    duration_sec,
    score desc
  );


-- =========================
-- leaderboard_public_cache
-- =========================
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
  on public.leaderboard_public_cache (
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


-- =========================
-- leaderboard_public_view
-- =========================
create or replace view public.leaderboard_public_view as
select
  c.period_type,
  c.period_start,
  c.mode,
  c.theme_id,
  c.level,
  c.case_mode,
  c.duration_sec,
  c.player_id,
  c.best_score,
  c.first_achieved_at,
  p.display_name,
  p.icon_url
from public.leaderboard_public_cache c
join public.players p
  on p.id = c.player_id;