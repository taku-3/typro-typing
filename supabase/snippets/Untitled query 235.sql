alter table public.consents
add constraint consents_player_id_unique unique (player_id);