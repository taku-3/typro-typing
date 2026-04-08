-- 例：不足分を足す（既存と衝突するなら調整）
alter table public.scores
  add column if not exists mode text not null default 'word',
  add column if not exists theme_id text not null,
  add column if not exists level text not null,
  add column if not exists case_mode text not null,
  add column if not exists duration_sec int not null,
  add column if not exists ended_at timestamptz not null default now(),
  add column if not exists score int not null,
  add column if not exists accuracy int not null,
  add column if not exists speed_cps numeric not null,
  add column if not exists typed_chars int not null,
  add column if not exists mistyped_count int not null,
  add column if not exists rank_status text not null default 'ranked',
  add column if not exists flag_reason text null;

create index if not exists scores_lookup_idx
  on public.scores (mode, theme_id, level, case_mode, duration_sec, ended_at desc);

create index if not exists scores_player_idx
  on public.scores (player_id, ended_at desc);

create index if not exists scores_ranked_idx
  on public.scores (mode, theme_id, level, case_mode, duration_sec, score desc)
  where rank_status = 'ranked';