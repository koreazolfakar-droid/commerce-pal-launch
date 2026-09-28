-- Dashboard scale hardening: server-side search and aggregate snapshots.
-- All functions remain SECURITY INVOKER and explicitly require dashboard staff.

create extension if not exists pg_trgm with schema extensions;

create index if not exists store_products_title_trgm_idx
  on public.store_products using gin (lower(title) extensions.gin_trgm_ops);

create index if not exists store_products_sku_trgm_idx
  on public.store_products using gin (lower(coalesce(sku, '')) extensions.gin_trgm_ops);

create index if not exists store_product_variants_sku_trgm_idx
  on public.store_product_variants using gin (lower(coalesce(sku, '')) extensions.gin_trgm_ops);

create index if not exists cms_brands_name_trgm_idx
  on public.cms_brands using gin (lower(name) extensions.gin_trgm_ops);

create index if not exists store_categories_name_trgm_idx
  on public.store_categories using gin (lower(name) extensions.gin_trgm_ops);


create or replace function public.get_dashboard_order_stats()
returns table(
  all_count bigint,
  new_count bigint,
  confirmed_count bigint,
  processing_count bigint,
  ready_count bigint,
  out_for_delivery_count bigint,
  delivered_count bigint,
  done_count bigint,
  cancelled_count bigint
)
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where status = 'new')::bigint,
    count(*) filter (where status = 'confirmed')::bigint,
    count(*) filter (where status = 'processing')::bigint,
    count(*) filter (where status = 'ready')::bigint,
    count(*) filter (where status = 'out_for_delivery')::bigint,
    count(*) filter (where status = 'delivered')::bigint,
    count(*) filter (where status = 'done')::bigint,
    count(*) filter (where status = 'cancelled')::bigint
  from public.store_orders;
end;
$$;

revoke all on function public.get_dashboard_order_stats() from public, anon;
grant execute on function public.get_dashboard_order_stats() to authenticated;


create or replace function public.search_dashboard_products(
  p_query text,
  p_limit integer default 12
)
returns table(
  id uuid,
  name text,
  brand text,
  category text,
  sku text
)
language plpgsql
security invoker
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_raw text := lower(btrim(coalesce(p_query, '')));
  v_term text;
  v_limit integer := least(25, greatest(1, coalesce(p_limit, 12)));
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if char_length(v_raw) < 2 then
    return;
  end if;

  v_term := replace(replace(replace(v_raw, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');

  return query
  select
    product.id,
    product.title,
    coalesce(brand_row.name, ''),
    coalesce(category_row.name, product.product_type, ''),
    coalesce(variant_row.sku, product.sku, '')
  from public.store_products as product
  left join public.cms_brands as brand_row
    on brand_row.id = product.brand_id
  left join public.store_categories as category_row
    on category_row.id = product.category_id
  left join lateral (
    select variant.sku
    from public.store_product_variants as variant
    where variant.product_id = product.id
      and variant.is_active = true
    order by variant.sort_order, variant.created_at, variant.id
    limit 1
  ) as variant_row on true
  where
    lower(product.title) like '%' || v_term || '%' escape E'\\'
    or lower(coalesce(product.sku, '')) like '%' || v_term || '%' escape E'\\'
    or exists (
      select 1
      from public.store_product_variants as searchable_variant
      where searchable_variant.product_id = product.id
        and searchable_variant.is_active = true
        and lower(coalesce(searchable_variant.sku, '')) like '%' || v_term || '%' escape E'\\'
    )
    or lower(coalesce(brand_row.name, '')) like '%' || v_term || '%' escape E'\\'
    or lower(coalesce(category_row.name, '')) like '%' || v_term || '%' escape E'\\'
  order by
    case
      when lower(coalesce(variant_row.sku, product.sku, '')) = v_raw then 0
      when lower(product.title) = v_raw then 1
      when lower(product.title) like v_term || '%' escape E'\\' then 2
      when lower(coalesce(variant_row.sku, product.sku, '')) like v_term || '%' escape E'\\' then 3
      else 4
    end,
    product.updated_at desc,
    product.title
  limit v_limit;
end;
$$;

revoke all on function public.search_dashboard_products(text, integer) from public, anon;
grant execute on function public.search_dashboard_products(text, integer) to authenticated;


create or replace function public.get_dashboard_home_snapshot(
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'invalid dashboard period';
  end if;

  with
  period_orders as (
    select id, created_at
    from public.store_orders
    where created_at >= p_start and created_at <= p_end
  ),
  period_sales as (
    select order_id, total, completed_at
    from public.store_sales
    where completed_at >= p_start
      and completed_at <= p_end
      and payment_status in ('paid', 'partially_refunded')
  ),
  day_series as (
    select generate_series(
      date_trunc('day', p_start),
      date_trunc('day', p_end),
      interval '1 day'
    ) as day
  ),
  daily_orders as (
    select date_trunc('day', created_at) as day, count(*)::integer as orders
    from period_orders
    group by 1
  ),
  daily_sales as (
    select date_trunc('day', completed_at) as day, coalesce(sum(total), 0)::numeric as revenue
    from period_sales
    group by 1
  ),
  trend as (
    select jsonb_agg(
      jsonb_build_object(
        'date', to_char(series.day at time zone 'UTC', 'YYYY-MM-DD'),
        'label', to_char(series.day at time zone 'UTC', 'Mon FMDD'),
        'revenue', round(coalesce(sales.revenue, 0)::numeric, 2),
        'orders', coalesce(orders.orders, 0)
      )
      order by series.day
    ) as value
    from day_series as series
    left join daily_orders as orders on orders.day = series.day
    left join daily_sales as sales on sales.day = series.day
  ),
  recent_orders as (
    select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) as value
    from (
      select
        jsonb_build_object(
          'id', orders.id,
          'orderNumber', orders.public_order_number,
          'customer', orders.customer_name,
          'total', orders.total,
          'currency', orders.currency,
          'status', orders.status,
          'paymentStatus', orders.payment_status,
          'createdAt', orders.created_at
        ) as row_data,
        orders.created_at
      from public.store_orders as orders
      order by orders.created_at desc
      limit 6
    ) as recent
  ),
  sale_items as (
    select
      items.product_id,
      items.title,
      items.quantity,
      items.line_total
    from public.store_order_items as items
    join period_sales as sales on sales.order_id = items.order_id
  ),
  top_products as (
    select coalesce(jsonb_agg(row_data order by quantity desc, revenue desc), '[]'::jsonb) as value
    from (
      select
        jsonb_build_object(
          'productId', items.product_id,
          'title', max(items.title),
          'quantity', sum(items.quantity)::integer,
          'revenue', round(sum(items.line_total)::numeric, 2)
        ) as row_data,
        sum(items.quantity) as quantity,
        sum(items.line_total) as revenue
      from sale_items as items
      group by items.product_id, coalesce(items.product_id::text, items.title)
      order by quantity desc, revenue desc
      limit 5
    ) as ranked_products
  ),
  brand_totals as (
    select
      product.brand_id,
      coalesce(brand.name, 'Unknown brand') as name,
      sum(items.line_total)::numeric as revenue
    from sale_items as items
    join public.store_products as product on product.id = items.product_id
    left join public.cms_brands as brand on brand.id = product.brand_id
    where product.brand_id is not null
    group by product.brand_id, brand.name
  ),
  brand_sum as (
    select coalesce(sum(revenue), 0)::numeric as total from brand_totals
  ),
  top_brands as (
    select coalesce(jsonb_agg(row_data order by revenue desc), '[]'::jsonb) as value
    from (
      select
        jsonb_build_object(
          'brandId', totals.brand_id,
          'name', totals.name,
          'revenue', round(totals.revenue, 2),
          'share', case
            when sum_row.total > 0
              then round((totals.revenue / sum_row.total) * 100, 1)
            else 0
          end
        ) as row_data,
        totals.revenue
      from brand_totals as totals
      cross join brand_sum as sum_row
      order by totals.revenue desc
      limit 5
    ) as ranked_brands
  ),
  inventory_stats as (
    select
      coalesce(sum(stock_quantity), 0)::bigint as total_units,
      count(*) filter (where stock_quantity > 0 and stock_quantity <= 10)::bigint as low_count,
      count(*) filter (where stock_quantity <= 0)::bigint as out_count
    from public.store_product_variants
    where track_inventory = true and is_active = true
  )
  select jsonb_build_object(
    'periodStart', p_start,
    'periodEnd', p_end,
    'totalSales', round(coalesce((select sum(total) from period_sales), 0)::numeric, 2),
    'ordersLast30Days', (select count(*) from period_orders),
    'customerCount', (select count(*) from public.store_customers),
    'productCount', (select count(*) from public.store_products),
    'activeProductCount', (select count(*) from public.store_products where status = 'active'),
    'totalUnits', inventory.total_units,
    'lowStockVariants', inventory.low_count,
    'outOfStockVariants', inventory.out_count,
    'visibleBrandCount', (select count(*) from public.cms_brands where is_visible = true),
    'recentOrders', recent.value,
    'trend', trend.value,
    'topProducts', products.value,
    'topBrands', brands.value
  )
  into v_result
  from inventory_stats as inventory
  cross join recent_orders as recent
  cross join trend
  cross join top_products as products
  cross join top_brands as brands;

  return v_result;
end;
$$;

revoke all on function public.get_dashboard_home_snapshot(timestamptz, timestamptz)
from public, anon;
grant execute on function public.get_dashboard_home_snapshot(timestamptz, timestamptz)
to authenticated;
