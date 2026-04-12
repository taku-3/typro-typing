alter table public.players
add column if not exists kind text not null default 'registered';

comment on column public.players.kind is
  'Player type. Expected values: guest | registered';