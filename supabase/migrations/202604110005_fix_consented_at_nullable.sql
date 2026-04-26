do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'consents'
      and column_name = 'consented_at'
  ) then
    alter table public.consents
      alter column consented_at drop not null;
  end if;
end $$;