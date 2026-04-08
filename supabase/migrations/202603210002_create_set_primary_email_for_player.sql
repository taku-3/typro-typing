create or replace function public.set_primary_email_for_player(
  p_player_id uuid,
  p_email text
)
returns table (
  email_id uuid,
  out_email text,
  out_is_primary boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_email_id uuid;
begin
  v_email := lower(trim(p_email));

  if v_email is null or v_email = '' then
    raise exception 'email_required';
  end if;

  insert into public.emails (player_id, email, is_primary)
  select p_player_id, v_email, false
  where not exists (
    select 1
    from public.emails
    where player_id = p_player_id
      and lower(public.emails.email) = v_email
  );

  select e.id
    into v_email_id
  from public.emails e
  where e.player_id = p_player_id
    and lower(e.email) = v_email
  order by e.id
  limit 1;

  if v_email_id is null then
    raise exception 'email_not_found_after_insert';
  end if;

  update public.emails e
  set is_primary = false
  where e.player_id = p_player_id
    and e.is_primary = true;

  update public.emails e
  set is_primary = true
  where e.id = v_email_id
    and e.player_id = p_player_id;

  return query
  select e.id as email_id, e.email as out_email, e.is_primary as out_is_primary
  from public.emails e
  where e.id = v_email_id;
end;
$$;

revoke all on function public.set_primary_email_for_player(uuid, text) from public;
grant execute on function public.set_primary_email_for_player(uuid, text) to service_role;