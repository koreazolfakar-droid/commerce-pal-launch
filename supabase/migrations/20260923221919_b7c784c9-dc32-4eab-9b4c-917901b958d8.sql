-- Customer-facing order numbers
-- Keep the existing bigint order_number as an internal sequential identifier.
-- public_order_number is the stable customer/dashboard-facing reference.

alter table public.store_orders
  add column if not exists public_order_number text;

create or replace function public.generate_store_order_public_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate text;
begin
  loop
    v_candidate :=
      pg_catalog.lpad((10000 + pg_catalog.floor(pg_catalog.random() * 90000))::integer::text, 5, '0')
      || '-' ||
      pg_catalog.lpad((10000 + pg_catalog.floor(pg_catalog.random() * 90000))::integer::text, 5, '0');

    exit when not exists (
      select 1
      from public.store_orders
      where public_order_number = v_candidate
    );
  end loop;

  return v_candidate;
end;
$$;

revoke all on function public.generate_store_order_public_number()
  from public, anon, authenticated;
grant execute on function public.generate_store_order_public_number()
  to service_role;

do $$
declare
  v_order record;
begin
  for v_order in
    select id
    from public.store_orders
    where public_order_number is null
    order by created_at, id
  loop
    update public.store_orders
    set public_order_number = public.generate_store_order_public_number()
    where id = v_order.id;
  end loop;
end;
$$;

alter table public.store_orders
  alter column public_order_number
  set default public.generate_store_order_public_number();

alter table public.store_orders
  alter column public_order_number
  set not null;

create unique index if not exists store_orders_public_order_number_uidx
  on public.store_orders (public_order_number);

alter table public.store_orders
  drop constraint if exists store_orders_public_order_number_format;

alter table public.store_orders
  add constraint store_orders_public_order_number_format
  check (public_order_number ~ '^[0-9]{5}-[0-9]{5}$');

comment on column public.store_orders.public_order_number is
  'Stable customer-facing order reference in 5-digit dash 5-digit format.';

comment on function public.generate_store_order_public_number() is
  'Generates a unique-looking customer-facing order number. Internal order_number remains sequential.';