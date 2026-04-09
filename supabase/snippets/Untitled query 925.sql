create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,

  mode text not null default 'word', -- いまは word 固定
  theme_key text not null,           -- 例: 'animals' など（アプリ側のキー）
  duration_id uuid not null references public.durations(id),

  score int not null check (score >= 0),
  accuracy numeric(5,2),   -- 0-100
  wpm numeric(7,2),
  cps numeric(7,3),

  -- いまの「S判定ロジック」はフロント算出でも良いが、保存しておくと後で楽
  rank_grade text, -- 'S','A','B'...（任意）

  rank_status public.rank_status not null default 'ranked',

  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists scores_theme_duration_time_idx
  on public.scores (theme_key, duration_id, achieved_at desc);

create index if not exists scores_player_time_idx
  on public.scores (player_id, achieved_at desc);