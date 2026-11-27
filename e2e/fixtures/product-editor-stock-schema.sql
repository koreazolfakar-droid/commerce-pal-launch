-- Minimal isolated schema for executing the real product-editor migration.
-- Auth and collection dependencies are test doubles; the stock transaction,
-- movement writes, summary trigger, and editor body are real PostgreSQL code.
create schema private;
create schema auth;
create role anon;
create role authenticated;
create function auth.uid() returns uuid language sql as $$ select '00000000-0000-4000-8000-000000000010'::uuid $$;
create function private.is_dashboard_staff() returns boolean language sql as $$ select true $$;
create table cms_brands(id uuid primary key);
create table store_categories(id uuid primary key, name text, spec_template jsonb);
create table store_products (
 id uuid primary key default gen_random_uuid(), title text, handle text unique,
 description text, brand_id uuid, category_id uuid, product_type text, status text,
 currency text, base_price numeric default 100, compare_at_price numeric, sku text,
 barcode text, stock_quantity integer default 0, track_inventory boolean default true,
 seo_title text, seo_description text, specifications jsonb, published_at timestamptz,
 updated_at timestamptz default now()
);
create table store_product_variants (
 id uuid primary key default gen_random_uuid(), product_id uuid references store_products(id),
 title text, sku text, barcode text, price numeric, compare_at_price numeric,
 stock_quantity integer default 0, track_inventory boolean default true,
 allow_backorder boolean default false, options jsonb default '{}', image_url text,
 sort_order integer default 0, is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table store_inventory_movements (
 id uuid primary key default gen_random_uuid(), product_id uuid, variant_id uuid,
 movement_type text, quantity_delta integer, reference_type text, note text, created_by uuid
);
create table store_product_images (
 id uuid primary key default gen_random_uuid(), product_id uuid, url text, alt_text text,
 sort_order integer default 0, is_primary boolean default false, created_at timestamptz default now()
);
create function public.set_store_product_collections(uuid, uuid[]) returns void language plpgsql as $$
begin
 if cardinality($2) > 0 then raise exception 'invalid collection'; end if;
end;
$$;
