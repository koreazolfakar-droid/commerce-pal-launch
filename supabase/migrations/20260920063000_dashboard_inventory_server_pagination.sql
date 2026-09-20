create or replace function public.dashboard_inventory_page(
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
  variant_id uuid,
  product_name text,
  variant_title text,
  brand text,
  category_id uuid,
  category text,
  sku text,
  barcode text,
  image text,
  stock integer,
  product_stock integer,
  track_inventory boolean,
  variant_active boolean,
  product_status text,
  options jsonb,
  total_count bigint
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_threshold integer := greatest(coalesce(p_threshold, 10), 0);
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(100, greatest(coalesce(p_page_size, 20), 1));
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text in ('admin', 'editor')
  ) then
    raise exception 'dashboard authentication is required';
  end if;

  return query
  with filtered as (
    select
      p.id as product_id,
      v.id as variant_id,
      p.title as product_name,
      v.title as variant_title,
      coalesce(b.name, '') as brand,
      p.category_id,
      coalesce(c.name, p.product_type, '') as category,
      coalesce(v.sku, p.sku, '') as sku,
      coalesce(v.barcode, p.barcode, '') as barcode,
      coalesce(nullif(v.image_url, ''), img.url, '') as image,
      v.stock_quantity as stock,
      p.stock_quantity as product_stock,
      v.track_inventory,
      v.is_active as variant_active,
      p.status::text as product_status,
      v.options,
      p.sort_order as product_sort_order,
      v.sort_order as variant_sort_order
    from public.store_product_variants v
    join public.store_products p on p.id = v.product_id
    left join public.cms_brands b on b.id = p.brand_id
    left join public.store_categories c on c.id = p.category_id
    left join lateral (
      select spi.url
      from public.store_product_images spi
      where spi.product_id = p.id
      order by spi.is_primary desc, spi.sort_order asc, spi.id asc
      limit 1
    ) img on true
    where
      (
        p_uncategorized
        and p.category_id is null
        or not p_uncategorized
        and (p_category_id is null or p.category_id = p_category_id)
      )
      and (
        not p_only_low
        or (v.track_inventory and v.stock_quantity <= v_threshold)
      )
      and (
        v_search is null
        or concat_ws(
          ' ',
          p.title,
          v.title,
          v.options::text,
          coalesce(v.sku, p.sku, ''),
          coalesce(v.barcode, p.barcode, ''),
          coalesce(b.name, '')
        ) ilike '%' || v_search || '%'
      )
  )
  select
    f.product_id,
    f.variant_id,
    f.product_name,
    f.variant_title,
    f.brand,
    f.category_id,
    f.category,
    f.sku,
    f.barcode,
    f.image,
    f.stock,
    f.product_stock,
    f.track_inventory,
    f.variant_active,
    f.product_status,
    f.options,
    count(*) over() as total_count
  from filtered f
  order by lower(f.product_name), f.product_sort_order, f.variant_sort_order, f.variant_id
  limit v_page_size
  offset (v_page - 1) * v_page_size;
end;
$function$;

revoke all on function public.dashboard_inventory_page(text, uuid, boolean, boolean, integer, integer, integer) from public;
grant execute on function public.dashboard_inventory_page(text, uuid, boolean, boolean, integer, integer, integer) to authenticated;

create or replace function public.dashboard_inventory_summary(
  p_threshold integer default 10
)
returns table(
  total_units bigint,
  variant_count bigint,
  low_count bigint,
  out_count bigint
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_threshold integer := greatest(coalesce(p_threshold, 10), 0);
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text in ('admin', 'editor')
  ) then
    raise exception 'dashboard authentication is required';
  end if;

  return query
  select
    coalesce(sum(v.stock_quantity), 0)::bigint as total_units,
    count(*)::bigint as variant_count,
    count(*) filter (
      where v.track_inventory and v.stock_quantity > 0 and v.stock_quantity <= v_threshold
    )::bigint as low_count,
    count(*) filter (
      where v.track_inventory and v.stock_quantity <= 0
    )::bigint as out_count
  from public.store_product_variants v;
end;
$function$;

revoke all on function public.dashboard_inventory_summary(integer) from public;
grant execute on function public.dashboard_inventory_summary(integer) to authenticated;
