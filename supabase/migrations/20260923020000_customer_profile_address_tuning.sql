-- Production follow-up for the customer account/address feature.
-- Fresh databases receive the same settings from the base migration.

create index if not exists store_customer_addresses_edit_target_idx
  on public.store_customer_addresses(editing_address_id)
  where editing_address_id is not null;

drop policy if exists customer_profiles_owner_select on public.store_customer_profiles;
create policy customer_profiles_owner_select
on public.store_customer_profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists customer_profiles_owner_insert on public.store_customer_profiles;
create policy customer_profiles_owner_insert
on public.store_customer_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists customer_profiles_owner_update on public.store_customer_profiles;
create policy customer_profiles_owner_update
on public.store_customer_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists customer_addresses_owner_select on public.store_customer_addresses;
create policy customer_addresses_owner_select
on public.store_customer_addresses for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists customer_addresses_owner_insert on public.store_customer_addresses;
create policy customer_addresses_owner_insert
on public.store_customer_addresses for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists customer_addresses_owner_update on public.store_customer_addresses;
create policy customer_addresses_owner_update
on public.store_customer_addresses for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists customer_addresses_owner_delete on public.store_customer_addresses;
create policy customer_addresses_owner_delete
on public.store_customer_addresses for delete to authenticated
using ((select auth.uid()) = user_id);

update storage.buckets
set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/*', 'audio/*']::text[]
where id = 'customer-address-media';

drop policy if exists customer_address_media_select on storage.objects;
create policy customer_address_media_select
on storage.objects for select to authenticated
using (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists customer_address_media_insert on storage.objects;
create policy customer_address_media_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists customer_address_media_update on storage.objects;
create policy customer_address_media_update
on storage.objects for update to authenticated
using (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists customer_address_media_delete on storage.objects;
create policy customer_address_media_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.get_my_store_orders(p_limit integer default 30)
returns table (
  order_id uuid,
  order_number bigint,
  status text,
  payment_status text,
  payment_method text,
  currency text,
  subtotal numeric,
  shipping_total numeric,
  discount_total numeric,
  total numeric,
  delivery_address text,
  city text,
  delivery_location jsonb,
  created_at timestamptz,
  completed_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  with verified_identity as (
    select
      id as user_id,
      pg_catalog.lower(pg_catalog.coalesce(email, '')) as email,
      pg_catalog.regexp_replace(pg_catalog.coalesce(phone, ''), '[^0-9]+', '', 'g') as phone
    from auth.users
    where id = (select auth.uid())
  )
  select
    orders.id,
    orders.order_number,
    orders.status,
    orders.payment_status,
    orders.payment_method,
    orders.currency,
    orders.subtotal,
    orders.shipping_total,
    orders.discount_total,
    orders.total,
    orders.delivery_address,
    orders.city,
    orders.delivery_location,
    orders.created_at,
    orders.completed_at
  from public.store_orders as orders
  cross join verified_identity as identity
  where
    orders.customer_user_id = identity.user_id
    or (
      identity.email <> ''
      and pg_catalog.lower(pg_catalog.coalesce(orders.customer_email, '')) = identity.email
    )
    or (
      identity.phone <> ''
      and pg_catalog.regexp_replace(
        pg_catalog.coalesce(orders.customer_phone, ''),
        '[^0-9]+',
        '',
        'g'
      ) = identity.phone
    )
  order by orders.created_at desc
  limit pg_catalog.greatest(1, pg_catalog.least(pg_catalog.coalesce(p_limit, 30), 100))
$$;

revoke all on function public.get_my_store_orders(integer) from public, anon;
grant execute on function public.get_my_store_orders(integer) to authenticated;

create or replace function public.get_my_store_order_items(p_order_id uuid)
returns table (
  item_id uuid,
  product_id uuid,
  variant_id uuid,
  title text,
  variant_title text,
  sku text,
  unit_price numeric,
  quantity integer,
  line_total numeric,
  options jsonb
)
language sql
security definer
set search_path = ''
as $$
  with verified_identity as (
    select
      id as user_id,
      pg_catalog.lower(pg_catalog.coalesce(email, '')) as email,
      pg_catalog.regexp_replace(pg_catalog.coalesce(phone, ''), '[^0-9]+', '', 'g') as phone
    from auth.users
    where id = (select auth.uid())
  ),
  owned_order as (
    select orders.id
    from public.store_orders as orders
    cross join verified_identity as identity
    where orders.id = p_order_id
      and (
        orders.customer_user_id = identity.user_id
        or (
          identity.email <> ''
          and pg_catalog.lower(pg_catalog.coalesce(orders.customer_email, '')) = identity.email
        )
        or (
          identity.phone <> ''
          and pg_catalog.regexp_replace(
            pg_catalog.coalesce(orders.customer_phone, ''),
            '[^0-9]+',
            '',
            'g'
          ) = identity.phone
        )
      )
  )
  select
    item.id,
    item.product_id,
    item.variant_id,
    item.title,
    item.variant_title,
    item.sku,
    item.unit_price,
    item.quantity,
    item.line_total,
    item.options
  from public.store_order_items as item
  join owned_order on owned_order.id = item.order_id
  order by item.id
$$;

revoke all on function public.get_my_store_order_items(uuid) from public, anon;
grant execute on function public.get_my_store_order_items(uuid) to authenticated;
