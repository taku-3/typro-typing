create or replace function public.period_start(p_type text, p_now date)
returns date
language plpgsql
immutable
as $$
begin
  if p_type = 'daily' then
    return p_now;
  elsif p_type = 'weekly' then
    -- ISO: 月曜開始
    return (p_now - ((extract(isodow from p_now)::int) - 1));
  elsif p_type = 'monthly' then
    return date_trunc('month', p_now)::date;
  elsif p_type = 'yearly' then
    return date_trunc('year', p_now)::date;
  elsif p_type = 'alltime' then
    return date '1970-01-01';
  else
    raise exception 'invalid period_type: %', p_type;
  end if;
end;
$$;