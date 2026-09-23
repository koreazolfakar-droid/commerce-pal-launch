-- Customer storefront profile + Toters-style saved delivery addresses.
-- Kept separate from store_customers CRM so Google-only users can own a
-- profile before they have a phone/order. Orders continue to store immutable
-- delivery snapshots in store_orders.

create table if not exists public.store_customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text,
  address_type text check (
    address_type is null or address_type in (
      'apartment',
      'house_villa',
      'compound',
      'office',
      'hotel',
      'other'
    )
  ),
  formatted_address text,
  area_street text,
  building_name text,
  building_number text,
  floor text,
  unit text,
  door_details text,
  phone text,
  delivery_instructions text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  place_id text,
  photo_paths text[] not null default '{}',
  voice_note_path text,
  editing_address_id uuid references public.store_customer_addresses(id) on delete set null,
  is_default boolean not null default false,
  is_draft boolean not null default true,
  draft_step integer not null default 1 check (draft_step between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_customer_addresses_user_idx
  on public.store_customer_addresses(user_id, updated_at desc);

create unique index if not exists store_customer_addresses_one_default_uidx
  on public.store_customer_addresses(user_id)
  where is_default = true and is_draft = false;

create unique index if not exists store_customer_addresses_one_draft_uidx
  on public.store_customer_addresses(user_id)
  where is_draft = true;

create index if not exists store_customer_addresses_edit_target_idx
  on public.store_customer_addresses(editing_address_id)
  where editing_address_id is not null;

alter table public.store_orders
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists store_orders_customer_user_created_idx
  on public.store_orders(customer_user_id, created_at desc)
  where customer_user_id is not null;

create or replace function private.touch_customer_storefront_row()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_store_customer_profiles on public.store_customer_profiles;
create trigger touch_store_customer_profiles
before update on public.store_customer_profiles
for each row execute function private.touch_customer_storefront_row();

drop trigger if exists touch_store_customer_addresses on public.store_customer_addresses;
create trigger touch_store_customer_addresses
before update on public.store_customer_addresses
for each row execute function private.touch_customer_storefront_row();

alter table public.store_customer_profiles enable row level security;
alter table public.store_customer_addresses enable row level security;

revoke all on public.store_customer_profiles from public, anon;
revoke all on public.store_customer_addresses from public, anon;
grant select, insert, update on public.store_customer_profiles to authenticated;
grant select, insert, update, delete on public.store_customer_addresses to authenticated;

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

create or replace function public.set_customer_default_address(p_address_id uuid)
returns public.store_customer_addresses
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_address public.store_customer_addresses%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_address
  from public.store_customer_addresses
  where id = p_address_id
    and user_id = v_user_id
    and is_draft = false
  for update;

  if not found then
    raise exception 'address not found';
  end if;

  update public.store_customer_addresses
  set is_default = false
  where user_id = v_user_id
    and id <> p_address_id
    and is_default = true;

  update public.store_customer_addresses
  set is_default = true
  where id = p_address_id
  returning * into v_address;

  return v_address;
end;
$$;

revoke all on function public.set_customer_default_address(uuid) from public, anon;
grant execute on function public.set_customer_default_address(uuid) to authenticated;

create or replace function public.start_customer_address_edit(p_address_id uuid)
returns public.store_customer_addresses
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.store_customer_addresses%rowtype;
  v_draft public.store_customer_addresses%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_source
  from public.store_customer_addresses
  where id = p_address_id
    and user_id = v_user_id
    and is_draft = false;

  if not found then
    raise exception 'address not found';
  end if;

  delete from public.store_customer_addresses
  where user_id = v_user_id
    and is_draft = true;

  insert into public.store_customer_addresses (
    user_id,
    nickname,
    address_type,
    formatted_address,
    area_street,
    building_name,
    building_number,
    floor,
    unit,
    door_details,
    phone,
    delivery_instructions,
    latitude,
    longitude,
    place_id,
    photo_paths,
    voice_note_path,
    editing_address_id,
    is_default,
    is_draft,
    draft_step
  ) values (
    v_user_id,
    v_source.nickname,
    v_source.address_type,
    v_source.formatted_address,
    v_source.area_street,
    v_source.building_name,
    v_source.building_number,
    v_source.floor,
    v_source.unit,
    v_source.door_details,
    v_source.phone,
    v_source.delivery_instructions,
    v_source.latitude,
    v_source.longitude,
    v_source.place_id,
    v_source.photo_paths,
    v_source.voice_note_path,
    v_source.id,
    false,
    true,
    1
  )
  returning * into v_draft;

  return v_draft;
end;
$$;

revoke all on function public.start_customer_address_edit(uuid) from public, anon;
grant execute on function public.start_customer_address_edit(uuid) to authenticated;

create or replace function public.finalize_customer_address(p_address_id uuid)
returns public.store_customer_addresses
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_address public.store_customer_addresses%rowtype;
  v_has_default boolean;
  v_result public.store_customer_addresses%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_address
  from public.store_customer_addresses
  where id = p_address_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'address not found';
  end if;
  if v_address.latitude is null or v_address.longitude is null then
    raise exception 'address location required';
  end if;
  if v_address.address_type is null then
    raise exception 'address type required';
  end if;
  if length(btrim(coalesce(v_address.nickname, ''))) < 1 then
    raise exception 'address nickname required';
  end if;
  if length(btrim(coalesce(v_address.area_street, v_address.formatted_address, ''))) < 2 then
    raise exception 'address details required';
  end if;
  if length(regexp_replace(coalesce(v_address.phone, ''), '[^0-9]+', '', 'g')) < 7 then
    raise exception 'address phone required';
  end if;

  if v_address.editing_address_id is not null then
    update public.store_customer_addresses
    set
      nickname = v_address.nickname,
      address_type = v_address.address_type,
      formatted_address = v_address.formatted_address,
      area_street = v_address.area_street,
      building_name = v_address.building_name,
      building_number = v_address.building_number,
      floor = v_address.floor,
      unit = v_address.unit,
      door_details = v_address.door_details,
      phone = v_address.phone,
      delivery_instructions = v_address.delivery_instructions,
      latitude = v_address.latitude,
      longitude = v_address.longitude,
      place_id = v_address.place_id,
      photo_paths = v_address.photo_paths,
      voice_note_path = v_address.voice_note_path
    where id = v_address.editing_address_id
      and user_id = v_user_id
      and is_draft = false
    returning * into v_result;

    if v_result.id is null then
      raise exception 'address edit target not found';
    end if;

    delete from public.store_customer_addresses
    where id = p_address_id and user_id = v_user_id;

    return v_result;
  end if;

  select exists(
    select 1
    from public.store_customer_addresses
    where user_id = v_user_id
      and is_draft = false
      and is_default = true
      and id <> p_address_id
  ) into v_has_default;

  update public.store_customer_addresses
  set
    is_draft = false,
    draft_step = 3,
    is_default = case when v_has_default then is_default else true end
  where id = p_address_id
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.finalize_customer_address(uuid) from public, anon;
grant execute on function public.finalize_customer_address(uuid) to authenticated;

-- Private bucket. A user can only access objects stored below their own auth UID.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'customer-address-media',
  'customer-address-media',
  false,
  8388608,
  array['image/*', 'audio/*']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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


-- Customer-facing order history is derived only from identifiers that Supabase
-- Auth has actually verified for the signed-in user. Profile fields are not
-- trusted for authorization, so editing a profile phone/email cannot expose a
-- different customer's orders.
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
      lower(coalesce(email, '')) as email,
      regexp_replace(coalesce(phone, ''), '[^0-9]+', '', 'g') as phone
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
  where (
      orders.customer_user_id = identity.user_id
      or (
        identity.email <> ''
        and lower(coalesce(orders.customer_email, '')) = identity.email
      )
      or (
        identity.phone <> ''
        and regexp_replace(coalesce(orders.customer_phone, ''), '[^0-9]+', '', 'g') = identity.phone
      )
    )
  order by orders.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100))
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
      lower(coalesce(email, '')) as email,
      regexp_replace(coalesce(phone, ''), '[^0-9]+', '', 'g') as phone
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
          and lower(coalesce(orders.customer_email, '')) = identity.email
        )
        or (
          identity.phone <> ''
          and regexp_replace(coalesce(orders.customer_phone, ''), '[^0-9]+', '', 'g') = identity.phone
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
