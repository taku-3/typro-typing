alter table public.credentials
add column if not exists birth_year integer;

alter table public.credentials
add column if not exists birth_month integer;