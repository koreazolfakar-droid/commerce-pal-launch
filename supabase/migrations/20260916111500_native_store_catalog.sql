-- Native Space Call commerce backend. Shopify is no longer required for catalog ownership.

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  slug text not null unique,
  description text,
  image_url text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_ar text,
  handle text not null unique,
  description text not null default '',
  description_ar text,
  description_html text,
  brand_id uuid references public.cms_brands(id) on delete set null,
  category_id uuid references public.store_categories(id) on delete set null,
  product_type text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  currency text not null default 'USD' check (char_length(currency) = 3),
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  sku text,
  barcode text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  track_inventory boolean not null default true,
  allow_backorder boolean not null default false,
  featured boolean not null default false,
  best_seller boolean not null default false,
  tags text[] not null default '{}',
  specifications jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(product_id, url)
);

create table if not exists public.store_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  title text not null default 'Default',
  sku text,
  barcode text,
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  track_inventory boolean not null default true,
  allow_backorder boolean not null default false,
  options jsonb not null default '{}'::jsonb,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_product_variants_sku_unique
  on public.store_product_variants(sku)
  where sku is not null and btrim(sku) <> '';
create index if not exists store_products_status_idx on public.store_products(status, sort_order, created_at desc);
create index if not exists store_products_brand_idx on public.store_products(brand_id) where status = 'active';
create index if not exists store_products_category_idx on public.store_products(category_id) where status = 'active';
create index if not exists store_product_variants_product_idx on public.store_product_variants(product_id, sort_order);
create index if not exists store_product_images_product_idx on public.store_product_images(product_id, sort_order);

create table if not exists public.store_collections (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  title text not null,
  title_ar text,
  description text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_collection_products (
  collection_id uuid not null references public.store_collections(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  sort_order integer not null default 0,
  primary key(collection_id, product_id)
);
create index if not exists store_collection_products_product_idx on public.store_collection_products(product_id);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded','partially_refunded')),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_address text,
  city text,
  notes text,
  currency text not null default 'USD' check (char_length(currency) = 3),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  source text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete set null,
  variant_id uuid references public.store_product_variants(id) on delete set null,
  title text not null,
  variant_title text,
  sku text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists store_order_items_order_idx on public.store_order_items(order_id);

create table if not exists public.store_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products(id) on delete cascade,
  variant_id uuid references public.store_product_variants(id) on delete cascade,
  movement_type text not null check (movement_type in ('purchase','sale','return','adjustment','reservation','release')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reference_type text,
  reference_id text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists store_inventory_movements_product_idx on public.store_inventory_movements(product_id, created_at desc);
create index if not exists store_inventory_movements_variant_idx on public.store_inventory_movements(variant_id, created_at desc);

create or replace function private.store_touch_updated_at()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.store_sync_product_summary()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_product_id uuid;
  next_stock integer;
  next_price numeric(12,2);
  next_compare numeric(12,2);
begin
  target_product_id := coalesce(new.product_id, old.product_id);
  select
    coalesce(sum(case when is_active then stock_quantity else 0 end), 0),
    min(price) filter (where is_active),
    min(compare_at_price) filter (where is_active and compare_at_price is not null)
  into next_stock, next_price, next_compare
  from public.store_product_variants
  where product_id = target_product_id;

  update public.store_products
  set stock_quantity = coalesce(next_stock, 0),
      base_price = coalesce(next_price, base_price),
      compare_at_price = next_compare,
      updated_at = now()
  where id = target_product_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists store_categories_touch_updated_at on public.store_categories;
create trigger store_categories_touch_updated_at before update on public.store_categories
for each row execute function private.store_touch_updated_at();
drop trigger if exists store_products_touch_updated_at on public.store_products;
create trigger store_products_touch_updated_at before update on public.store_products
for each row execute function private.store_touch_updated_at();
drop trigger if exists store_product_variants_touch_updated_at on public.store_product_variants;
create trigger store_product_variants_touch_updated_at before update on public.store_product_variants
for each row execute function private.store_touch_updated_at();
drop trigger if exists store_collections_touch_updated_at on public.store_collections;
create trigger store_collections_touch_updated_at before update on public.store_collections
for each row execute function private.store_touch_updated_at();
drop trigger if exists store_orders_touch_updated_at on public.store_orders;
create trigger store_orders_touch_updated_at before update on public.store_orders
for each row execute function private.store_touch_updated_at();
drop trigger if exists store_variant_sync_product_summary on public.store_product_variants;
create trigger store_variant_sync_product_summary after insert or update or delete on public.store_product_variants
for each row execute function private.store_sync_product_summary();

alter table public.store_categories enable row level security;
alter table public.store_products enable row level security;
alter table public.store_product_images enable row level security;
alter table public.store_product_variants enable row level security;
alter table public.store_collections enable row level security;
alter table public.store_collection_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_inventory_movements enable row level security;

revoke all on public.store_categories, public.store_products, public.store_product_images,
  public.store_product_variants, public.store_collections, public.store_collection_products,
  public.store_orders, public.store_order_items, public.store_inventory_movements from anon, authenticated;

grant select on public.store_categories, public.store_products, public.store_product_images,
  public.store_product_variants, public.store_collections, public.store_collection_products to anon, authenticated;
grant insert, update, delete on public.store_categories, public.store_products, public.store_product_images,
  public.store_product_variants, public.store_collections, public.store_collection_products,
  public.store_orders, public.store_order_items, public.store_inventory_movements to authenticated;
grant select on public.store_orders, public.store_order_items, public.store_inventory_movements to authenticated;

drop policy if exists store_categories_public_read on public.store_categories;
create policy store_categories_public_read on public.store_categories for select to anon, authenticated
using (is_active or (select private.is_dashboard_staff()));
drop policy if exists store_categories_staff_write on public.store_categories;
create policy store_categories_staff_write on public.store_categories for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_products_public_read on public.store_products;
create policy store_products_public_read on public.store_products for select to anon, authenticated
using ((status = 'active' and (published_at is null or published_at <= now())) or (select private.is_dashboard_staff()));
drop policy if exists store_products_staff_write on public.store_products;
create policy store_products_staff_write on public.store_products for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_product_images_public_read on public.store_product_images;
create policy store_product_images_public_read on public.store_product_images for select to anon, authenticated
using (exists (select 1 from public.store_products p where p.id = product_id and p.status = 'active' and (p.published_at is null or p.published_at <= now())) or (select private.is_dashboard_staff()));
drop policy if exists store_product_images_staff_write on public.store_product_images;
create policy store_product_images_staff_write on public.store_product_images for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_product_variants_public_read on public.store_product_variants;
create policy store_product_variants_public_read on public.store_product_variants for select to anon, authenticated
using ((is_active and exists (select 1 from public.store_products p where p.id = product_id and p.status = 'active' and (p.published_at is null or p.published_at <= now()))) or (select private.is_dashboard_staff()));
drop policy if exists store_product_variants_staff_write on public.store_product_variants;
create policy store_product_variants_staff_write on public.store_product_variants for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_collections_public_read on public.store_collections;
create policy store_collections_public_read on public.store_collections for select to anon, authenticated
using (is_active or (select private.is_dashboard_staff()));
drop policy if exists store_collections_staff_write on public.store_collections;
create policy store_collections_staff_write on public.store_collections for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_collection_products_public_read on public.store_collection_products;
create policy store_collection_products_public_read on public.store_collection_products for select to anon, authenticated
using ((exists (select 1 from public.store_collections c where c.id = collection_id and c.is_active)
  and exists (select 1 from public.store_products p where p.id = product_id and p.status = 'active' and (p.published_at is null or p.published_at <= now())))
  or (select private.is_dashboard_staff()));
drop policy if exists store_collection_products_staff_write on public.store_collection_products;
create policy store_collection_products_staff_write on public.store_collection_products for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_orders_staff_all on public.store_orders;
create policy store_orders_staff_all on public.store_orders for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));
drop policy if exists store_order_items_staff_all on public.store_order_items;
create policy store_order_items_staff_all on public.store_order_items for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));
drop policy if exists store_inventory_staff_all on public.store_inventory_movements;
create policy store_inventory_staff_all on public.store_inventory_movements for all to authenticated
using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));