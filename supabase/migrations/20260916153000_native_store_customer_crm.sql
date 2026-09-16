create table if not exists public.store_customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  phone_normalized text not null unique,
  name text not null,
  email text,
  city text,
  default_address text,
  internal_notes text,
  tags text[] not null default '{}',
  is_vip boolean not null default false,
  is_blocked boolean not null default false,
  total_orders integer not null default 0,
  total_spent numeric(12,2) not null default 0 check (total_spent >= 0),
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_customers_name_idx on public.store_customers(lower(name));
create index if not exists store_customers_last_order_idx on public.store_customers(last_order_at desc nulls last);

create or replace function private.normalize_customer_phone(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(value, ''), '[^0-9]+', '', 'g')
$$;

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
  if normalized = '' then return; end if;

  select * into latest_order
  from public.store_orders
  where private.normalize_customer_phone(customer_phone) = normalized
  order by created_at desc
  limit 1;

  if latest_order.id is null then
    delete from public.store_customers
    where phone_normalized = normalized
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
    phone = excluded.phone,
    name = excluded.name,
    email = coalesce(excluded.email, public.store_customers.email),
    city = coalesce(excluded.city, public.store_customers.city),
    default_address = coalesce(excluded.default_address, public.store_customers.default_address),
    total_orders = excluded.total_orders,
    total_spent = excluded.total_spent,
    last_order_at = excluded.last_order_at,
    updated_at = now();
end;
$$;

create or replace function private.sync_customer_from_order()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform private.rebuild_customer_from_phone(old.customer_phone);
    return old;
  end if;

  perform private.rebuild_customer_from_phone(new.customer_phone);

  if tg_op = 'UPDATE' and private.normalize_customer_phone(old.customer_phone) <> private.normalize_customer_phone(new.customer_phone) then
    perform private.rebuild_customer_from_phone(old.customer_phone);
  end if;

  return new;
end;
$$;

drop trigger if exists store_orders_sync_customer on public.store_orders;
create trigger store_orders_sync_customer
after insert or update or delete on public.store_orders
for each row execute function private.sync_customer_from_order();

alter table public.store_customers enable row level security;
revoke all on public.store_customers from anon, authenticated;
grant select, insert, update, delete on public.store_customers to authenticated;

drop policy if exists store_customers_staff_read on public.store_customers;
create policy store_customers_staff_read on public.store_customers
for select to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_customers_staff_write on public.store_customers;
create policy store_customers_staff_write on public.store_customers
for all to authenticated
using ((select private.is_dashboard_staff()))
with check ((select private.is_dashboard_staff()));

do $$
declare r record;
begin
  for r in select distinct customer_phone from public.store_orders loop
    perform private.rebuild_customer_from_phone(r.customer_phone);
  end loop;
end $$;
