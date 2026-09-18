alter table public.store_customers
  add column if not exists is_profile_managed boolean not null default false;

create or replace function private.rebuild_customer_from_phone(input_phone text)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  normalized text := private.normalize_customer_phone(input_phone);
  latest_order public.store_orders%rowtype;
  order_count integer := 0;
  spent numeric(12,2) := 0;
begin
  if normalized = '' then
    return;
  end if;

  select * into latest_order
  from public.store_orders
  where private.normalize_customer_phone(customer_phone) = normalized
  order by created_at desc
  limit 1;

  if latest_order.id is null then
    delete from public.store_customers
    where phone_normalized = normalized
      and is_profile_managed = false
      and coalesce(internal_notes, '') = ''
      and cardinality(tags) = 0
      and is_vip = false
      and is_blocked = false;
    return;
  end if;

  select count(*)::integer,
         coalesce(sum(case when status <> 'cancelled' then total else 0 end), 0)
    into order_count, spent
  from public.store_orders
  where private.normalize_customer_phone(customer_phone) = normalized;

  insert into public.store_customers (
    phone, phone_normalized, name, email, city, default_address,
    total_orders, total_spent, last_order_at
  ) values (
    latest_order.customer_phone,
    normalized,
    latest_order.customer_name,
    latest_order.customer_email,
    latest_order.city,
    latest_order.delivery_address,
    order_count,
    spent,
    latest_order.created_at
  )
  on conflict (phone_normalized) do update set
    phone = case
      when public.store_customers.is_profile_managed then public.store_customers.phone
      else excluded.phone
    end,
    name = case
      when public.store_customers.is_profile_managed then public.store_customers.name
      else excluded.name
    end,
    email = case
      when public.store_customers.is_profile_managed then public.store_customers.email
      else coalesce(excluded.email, public.store_customers.email)
    end,
    city = case
      when public.store_customers.is_profile_managed then public.store_customers.city
      else coalesce(excluded.city, public.store_customers.city)
    end,
    default_address = case
      when public.store_customers.is_profile_managed then public.store_customers.default_address
      else coalesce(excluded.default_address, public.store_customers.default_address)
    end,
    total_orders = excluded.total_orders,
    total_spent = excluded.total_spent,
    last_order_at = excluded.last_order_at,
    updated_at = now();
end;
$$;

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
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

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
    phone, phone_normalized, name, email, city, default_address,
    internal_notes, tags, is_vip, is_blocked,
    total_orders, total_spent, last_order_at, is_profile_managed
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
    0, 0, null, true
  )
  returning * into v_customer;

  return v_customer;
exception
  when unique_violation then
    raise exception 'customer phone already exists';
end;
$$;

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
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

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
    is_profile_managed = true,
    updated_at = now()
  where id = p_customer_id
  returning * into v_customer;

  if v_customer.id is null then raise exception 'customer not found'; end if;
  return v_customer;
end;
$$;
