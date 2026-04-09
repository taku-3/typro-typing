-- period types for cache
create type public.leaderboard_period as enum ('day','week','month','year');

-- ranking status (anti-cheat / moderation)
create type public.rank_status as enum ('ranked','needs_review','excluded');