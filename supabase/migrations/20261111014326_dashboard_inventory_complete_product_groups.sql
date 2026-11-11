-- Inventory groups are paginated by canonical product ID, not by variant rows.
-- Public entrypoint stays SECURITY INVOKER; existing dashboard AAL2/passkey guard
-- and the original RLS policies must both permit every returned row.
-- This additive function does not modify stock, movements or existing RPCs.
create or replace function public.dashboard_inventory_products_page(
  p_search text default null,
  p_category_id uuid default null,
  p_uncategorized boolean default false,
  p_only_low boolean default false,
  p_threshold integer default 10,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table(
  product_id uuid,
  product_name text,
  brand text,
  category_id uuid,
  category text,
  image text,
  product_stock integer,
  product_status text,
  variants jsonb,
  total_count bigint
)
language sql
stable
security invoker
set search_path to ''
as $fn$
  with parameters as (
    select
      nullif(btrim(left(coalesce(p_search, ''), 120)), '') as search_term,
      greatest(coalesce(p_threshold, 10), 0) as threshold,
      greatest(coalesce(p_page, 1), 1) as requested_page,
      least(100, greatest(coalesce(p_page_size, 20), 1)) as requested_size
  ),
  matching_products as (
    select p.id, p.title, p.sort_order
    from public.store_products p
    cross join parameters input
    where (select auth.uid()) is not null
      and (select private.is_dashboard_staff())
      and (
        (p_uncategorized and p.category_id is null)
        or (not p_uncategorized and (p_category_id is null or p.category_id = p_category_id))
      )
      and exists (
        select 1
        from public.store_product_variants v
        left join public.cms_brands b on b.id = p.brand_id
        where v.product_id = p.id
          and (
            not p_only_low
            or (v.track_inventory and v.stock_quantity <= input.threshold)
          )
          and (
            input.search_term is null
            or pg_catalog.concat_ws(
              ' ',
              p.title,
              v.title,
              v.options::text,
              coalesce(v.sku, p.sku, ''),
              coalesce(v.barcode, p.barcode, ''),
              coalesce(b.name, '')
            ) ilike '%' || input.search_term || '%'
          )
      )
  ),
  product_page as (
    select mp.id, mp.title, mp.sort_order, count(*) over() as total_count
    from matching_products mp
    order by lower(mp.title), mp.sort_order nulls last, mp.id
    limit (select requested_size from parameters)
    offset ((select requested_page from parameters) - 1) * (select requested_size from parameters)
  )
  select
    p.id as product_id,
    p.title as product_name,
    coalesce(b.name, '')::text as brand,
    p.category_id,
    coalesce(c.name, p.product_type, '')::text as category,
    coalesce(img.url, '')::text as image,
    p.stock_quantity as product_stock,
    p.status::text as product_status,
    details.variants,
    page.total_count
  from product_page page
  join public.store_products p on p.id = page.id
  left join public.cms_brands b on b.id = p.brand_id
  left join public.store_categories c on c.id = p.category_id
  left join lateral (
    select spi.url
    from public.store_product_images spi
    where spi.product_id = p.id
    order by spi.is_primary desc, spi.sort_order asc, spi.id asc
    limit 1
  ) img on true
  cross join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'variant_id', v.id,
          'variant_title', v.title,
          'sku', coalesce(v.sku, p.sku, ''),
          'barcode', coalesce(v.barcode, p.barcode, ''),
          'image', coalesce(nullif(v.image_url, ''), img.url, ''),
          'stock', v.stock_quantity,
          'track_inventory', v.track_inventory,
          'variant_active', v.is_active,
          'options', v.options
        )
        order by v.sort_order nulls last, v.id
      ), '[]'::jsonb
    ) as variants
    from public.store_product_variants v
    where v.product_id = p.id
  ) details
  order by lower(page.title), page.sort_order nulls last, page.id;
$fn$;

revoke all on function public.dashboard_inventory_products_page(
  text, uuid, boolean, boolean, integer, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function public.dashboard_inventory_products_page(
  text, uuid, boolean, boolean, integer, integer, integer
) to authenticated, service_role;
