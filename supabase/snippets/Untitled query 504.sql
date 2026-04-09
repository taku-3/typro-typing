create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),

  player_id uuid not null references public.players(id) on delete cascade,

  mode text not null default 'word',

  theme_id text not null,
  level text not null,
  case_mode text not null,
  duration_sec int not null,

  ended_at timestamptz not null default now(),
  score int not null,
  accuracy int not null,
  speed_cps numeric not null,
  typed_chars int not null,
  mistyped_count int not null,

  rank_status text not null default 'ranked',
  flag_reason text null
);

create index if not exists scores_lookup_idx
  on public.scores (mode, theme_id, level, case_mode, duration_sec, ended_at desc);

create index if not exists scores_player_idx
  on public.scores (player_id, ended_at desc);

create index if not exists scores_ranked_idx
  on public.scores (mode, theme_id, level, case_mode, duration_sec, score desc)
  where rank_status = 'ranked';