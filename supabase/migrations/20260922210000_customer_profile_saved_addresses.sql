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
using (auth.uid() = user_id);

drop policy if exists customer_profiles_owner_insert on public.store_customer_profiles;
create policy customer_profiles_owner_insert
on public.store_customer_profiles for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists customer_profiles_owner_update on public.store_customer_profiles;
create policy customer_profiles_owner_update
on public.store_customer_profiles for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists customer_addresses_owner_select on public.store_customer_addresses;
create policy customer_addresses_owner_select
on public.store_customer_addresses for select to authenticated
using (auth.uid() = user_id);

drop policy if exists customer_addresses_owner_insert on public.store_customer_addresses;
create policy customer_addresses_owner_insert
on public.store_customer_addresses for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists customer_addresses_owner_update on public.store_customer_addresses;
create policy customer_addresses_owner_update
on public.store_customer_addresses for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists customer_addresses_owner_delete on public.store_customer_addresses;
create policy customer_addresses_owner_delete
on public.store_customer_addresses for delete to authenticated
using (auth.uid() = user_id);

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
  returning * into v_address;

  return v_address;
end;
$$;

revoke all on function public.finalize_customer_address(uuid) from public, anon;
grant execute on function public.finalize_customer_address(uuid) to authenticated;

-- Private bucket. A user can only access objects stored below their own auth UID.
insert into storage.buckets (id, name, public)
values ('customer-address-media', 'customer-address-media', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists customer_address_media_select on storage.objects;
create policy customer_address_media_select
on storage.objects for select to authenticated
using (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists customer_address_media_insert on storage.objects;
create policy customer_address_media_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists customer_address_media_update on storage.objects;
create policy customer_address_media_update
on storage.objects for update to authenticated
using (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists customer_address_media_delete on storage.objects;
create policy customer_address_media_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'customer-address-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
