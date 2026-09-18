create or replace function public.create_store_customer(
  p_name text,
  p_phone text,
  p_email text default null,
  p_city text default null,
  p_default_address text default null,
  p_tags text[] default '{}'::text[],
  p_is_vip boolean default false,
  p_is_blocked boolean default false,
  p_internal_notes text default null
)
returns public.store_customers
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_customer public.store_customers%rowtype;
  v_phone_normalized text;
  v_tags text[];
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'customer name required';
  end if;

  v_phone_normalized := regexp_replace(coalesce(p_phone, ''), '[^0-9]+', '', 'g');
  if length(v_phone_normalized) < 6 then
    raise exception 'valid customer phone required';
  end if;

  select coalesce(array_agg(distinct tag order by tag), '{}'::text[])
  into v_tags
  from (
    select left(btrim(value), 60) as tag
    from unnest(coalesce(p_tags, '{}'::text[])) value
    where btrim(value) <> ''
    limit 50
  ) clean;

  insert into public.store_customers (
    phone,
    phone_normalized,
    name,
    email,
    city,
    default_address,
    internal_notes,
    tags,
    is_vip,
    is_blocked,
    total_orders,
    total_spent,
    last_order_at
  ) values (
    left(btrim(p_phone), 32),
    v_phone_normalized,
    left(btrim(p_name), 120),
    nullif(left(btrim(coalesce(p_email, '')), 200), ''),
    nullif(left(btrim(coalesce(p_city, '')), 120), ''),
    nullif(left(btrim(coalesce(p_default_address, '')), 500), ''),
    nullif(left(btrim(coalesce(p_internal_notes, '')), 2000), ''),
    v_tags,
    coalesce(p_is_vip, false),
    coalesce(p_is_blocked, false),
    0,
    0,
    null
  )
  returning * into v_customer;

  return v_customer;
exception
  when unique_violation then
    raise exception 'customer phone already exists';
end;
$$;

revoke all on function public.create_store_customer(text,text,text,text,text,text[],boolean,boolean,text)
  from public, anon;
grant execute on function public.create_store_customer(text,text,text,text,text,text[],boolean,boolean,text)
  to authenticated;

create or replace function public.update_store_customer_profile(
  p_customer_id uuid,
  p_name text,
  p_email text default null,
  p_city text default null,
  p_default_address text default null,
  p_tags text[] default '{}'::text[],
  p_is_vip boolean default false,
  p_is_blocked boolean default false,
  p_internal_notes text default null
)
returns public.store_customers
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_customer public.store_customers%rowtype;
  v_tags text[];
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'customer name required';
  end if;

  select coalesce(array_agg(distinct tag order by tag), '{}'::text[])
  into v_tags
  from (
    select left(btrim(value), 60) as tag
    from unnest(coalesce(p_tags, '{}'::text[])) value
    where btrim(value) <> ''
    limit 50
  ) clean;

  update public.store_customers
  set
    name = left(btrim(p_name), 120),
    email = nullif(left(btrim(coalesce(p_email, '')), 200), ''),
    city = nullif(left(btrim(coalesce(p_city, '')), 120), ''),
    default_address = nullif(left(btrim(coalesce(p_default_address, '')), 500), ''),
    internal_notes = nullif(left(btrim(coalesce(p_internal_notes, '')), 2000), ''),
    tags = v_tags,
    is_vip = coalesce(p_is_vip, false),
    is_blocked = coalesce(p_is_blocked, false),
    updated_at = now()
  where id = p_customer_id
  returning * into v_customer;

  if v_customer.id is null then
    raise exception 'customer not found';
  end if;

  return v_customer;
end;
$$;

revoke all on function public.update_store_customer_profile(uuid,text,text,text,text,text[],boolean,boolean,text)
  from public, anon;
grant execute on function public.update_store_customer_profile(uuid,text,text,text,text,text[],boolean,boolean,text)
  to authenticated;

create or replace function public.get_store_customer_orders(
  p_customer_id uuid,
  p_limit integer default 20
)
returns setof public.store_orders
language sql
security invoker
set search_path = public, pg_temp
as $$
  select o.*
  from public.store_orders o
  join public.store_customers c
    on c.id = p_customer_id
   and regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]+', '', 'g') = c.phone_normalized
  where private.is_dashboard_staff()
  order by o.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
$$;

revoke all on function public.get_store_customer_orders(uuid,integer) from public, anon;
grant execute on function public.get_store_customer_orders(uuid,integer) to authenticated;
