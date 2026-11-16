-- Read-only analytics. Keep the overview API and all write permissions unchanged.
create or replace function public.get_dashboard_analytics_snapshot(
  p_start timestamptz, p_end timestamptz,
  p_compare boolean default true, p_currency text default 'USD'
) returns jsonb language plpgsql security invoker
set search_path = public, private, pg_temp
set timezone = 'UTC'
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end)
    or p_end <= p_start or p_end - p_start > interval '366 days' then
    raise exception 'invalid analytics period';
  end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid currency'; end if;

  with periods as (
    select false as previous, p_start as start_at, p_end as end_at
    union all
    select true, p_start - (p_end-p_start), p_start where p_compare is true
  ), sales as materialized (
    select period.previous, sale.*,
      floor(extract(epoch from (sale.completed_at-period.start_at))/86400)::integer as day_index
    from periods period join public.store_sales sale
      on sale.completed_at >= period.start_at and sale.completed_at < period.end_at
    where sale.payment_status in ('paid', 'partially_refunded') and sale.currency = p_currency
  ), order_rows as (
    select period.previous, orders.id,
      floor(extract(epoch from (orders.created_at-period.start_at))/86400)::integer as day_index
    from periods period join public.store_orders orders
      on orders.created_at >= period.start_at and orders.created_at < period.end_at
    where orders.currency = p_currency
  ), metrics as (
    select period.previous, jsonb_build_object(
      'grossSales', coalesce((select sum(subtotal) from sales where previous=period.previous),0),
      'netSales', coalesce((select sum(greatest(subtotal-discount_total,0)) from sales where previous=period.previous),0),
      'paidOrders', (select count(*) from sales where previous=period.previous),
      'orders', (select count(*) from order_rows where previous=period.previous),
      'aov', coalesce((select round(avg(greatest(subtotal-discount_total,0)),2) from sales where previous=period.previous),0)
    ) as value from periods period
  ), days as (
    select i, p_start+i*interval '1 day' as day from generate_series(0,ceil(extract(epoch from (p_end-p_start))/86400)::integer-1) i
  ), daily_sales as (
    select previous, day_index, sum(greatest(subtotal-discount_total,0)) as revenue from sales group by 1,2
  ), daily_orders as (
    select previous, day_index, count(*) as orders from order_rows group by 1,2
  ), trend as (
    select jsonb_agg(jsonb_build_object(
      'date', day, 'previousDate', day-(p_end-p_start),
      'revenue', coalesce(current_sales.revenue,0), 'orders', coalesce(current_orders.orders,0),
      'previousRevenue', case when p_compare then coalesce(previous_sales.revenue,0) else null end,
      'previousOrders', case when p_compare then coalesce(previous_orders.orders,0) else null end
    ) order by days.i) as value
    from days
    left join daily_sales current_sales on current_sales.day_index=days.i and not current_sales.previous
    left join daily_orders current_orders on current_orders.day_index=days.i and not current_orders.previous
    left join daily_sales previous_sales on previous_sales.day_index=days.i and previous_sales.previous
    left join daily_orders previous_orders on previous_orders.day_index=days.i and previous_orders.previous
  ), inventory as materialized (
    select product_id, stock_quantity from public.store_product_variants where track_inventory and is_active
  ), product_stock as (
    select product_id,sum(stock_quantity) as stock,bool_or(stock_quantity<=10) as restock
    from inventory group by product_id
  ), product_sales as (
    select items.product_id, sales.previous, sum(items.quantity) as units,
      count(distinct items.order_id) as orders, sum(items.line_total) as revenue
    from public.store_order_items items join sales on sales.order_id=items.order_id
    group by items.product_id,sales.previous
  ), performance as (
    select product.id,product.title,product.sku,product.status,
      coalesce(current_sales.units,0) as units,coalesce(current_sales.orders,0) as orders,
      coalesce(current_sales.revenue,0) as revenue,
      case when p_compare then coalesce(previous_sales.units,0) else null end as previous_units,
      stock.stock,stock.restock, image.url as image
    from public.store_products product
    left join product_sales current_sales on current_sales.product_id=product.id and not current_sales.previous
    left join product_sales previous_sales on previous_sales.product_id=product.id and previous_sales.previous
    left join product_stock stock on stock.product_id=product.id
    left join lateral (
      select url from public.store_product_images where product_id=product.id
      order by is_primary desc,sort_order,url limit 1
    ) image on true
  ), product_json as (
    select *,jsonb_build_object('productId',id,'title',title,'sku',coalesce(sku,''),'image',coalesce(image,''),
      'units',units,'orders',orders,'revenue',revenue,'stock',stock,'previousUnits',previous_units) as value
    from performance
  )
  select jsonb_build_object(
    'periodStart',p_start,'periodEnd',p_end,
    'previousStart',case when p_compare then p_start-(p_end-p_start) else null end,
    'previousEnd',case when p_compare then p_start else null end,
    'currency',p_currency,
    'currencies',(select coalesce(jsonb_agg(currency order by currency),'[]'::jsonb) from (
      select currency from public.store_sales union select currency from public.store_orders union select p_currency
    ) currencies where currency ~ '^[A-Z]{3}$'),
    'current',(select value from metrics where not previous),
    'previous',(select value from metrics where previous),
    'catalog',jsonb_build_object(
      'customers',(select count(*) from public.store_customers),
      'products',(select count(*) from public.store_products),
      'totalUnits',(select coalesce(sum(stock_quantity),0) from inventory),
      'lowStock',(select count(*) from inventory where stock_quantity between 1 and 10),
      'criticalStock',(select count(*) from inventory where stock_quantity between 1 and 3),
      'outOfStock',(select count(*) from inventory where stock_quantity <= 0),
      'visibleBrands',(select count(*) from public.cms_brands where is_visible)
    ),
    'trend',(select value from trend),
    'products',jsonb_build_object(
      'topSelling',(select coalesce(jsonb_agg(value order by units desc,revenue desc,id),'[]'::jsonb) from (select * from product_json where units>0 order by units desc,revenue desc,id limit 8) ranked),
      'lowestPerforming',(select coalesce(jsonb_agg(value order by units,revenue,id),'[]'::jsonb) from (select * from product_json where status='active' order by units,revenue,id limit 8) ranked),
      'highestRevenue',(select coalesce(jsonb_agg(value order by revenue desc,units desc,id),'[]'::jsonb) from (select * from product_json where revenue>0 order by revenue desc,units desc,id limit 8) ranked),
      'restock',(select coalesce(jsonb_agg(value order by stock,units desc,id),'[]'::jsonb) from (select * from product_json where restock order by stock,units desc,id limit 8) ranked)
    ),
    'recentOrders',(select coalesce(jsonb_agg(value order by created_at desc,id),'[]'::jsonb) from (
      select id,created_at,jsonb_build_object('id',id,'orderNumber',public_order_number::text,
        'customer',customer_name,'total',total,'currency',currency,'status',status,'paymentStatus',payment_status,'createdAt',created_at) as value
      from public.store_orders order by created_at desc,id limit 6
    ) recent),
    'topBrands',(select coalesce(jsonb_agg(jsonb_build_object('brandId',brand_id,'name',name,'revenue',revenue,
      'share',share) order by revenue desc,brand_id),'[]'::jsonb) from (
      select *,round(100*revenue/nullif(sum(revenue) over(),0),1) as share from (
      select product.brand_id,coalesce(brand.name,'Unknown brand') as name,sum(items.line_total) as revenue
      from public.store_order_items items join sales on sales.order_id=items.order_id and not sales.previous
      join public.store_products product on product.id=items.product_id
      left join public.cms_brands brand on brand.id=product.brand_id
      where product.brand_id is not null group by product.brand_id,brand.name
      ) totals
      order by revenue desc,brand_id limit 5
    ) brands)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_dashboard_analytics_snapshot(timestamptz,timestamptz,boolean,text) from public, anon;
grant execute on function public.get_dashboard_analytics_snapshot(timestamptz,timestamptz,boolean,text) to authenticated;

create or replace function public.get_dashboard_inventory_alerts(
  p_search text default '', p_status text default 'all', p_sort text default 'severity',
  p_page integer default 1, p_page_size integer default 8
) returns jsonb language plpgsql security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_result jsonb;
  v_page integer := greatest(1,least(100000,coalesce(p_page,1)));
  v_size integer := greatest(1,least(50,coalesce(p_page_size,8)));
  v_term text := left(btrim(coalesce(p_search,'')),120);
begin
  if auth.uid() is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if p_status not in ('all','out','critical','low') or p_sort not in ('severity','stock-asc','stock-desc','name') then
    raise exception 'invalid inventory alert filter';
  end if;
  with alerts as (
    select product.id as product_id,variant.id as variant_id,product.title,
      coalesce(variant.sku,product.sku,'') as sku,variant.title as variant_title,
      variant.stock_quantity as stock,
      case when variant.stock_quantity<=0 then 'out' when variant.stock_quantity<=3 then 'critical' else 'low' end as status,
      case when variant.stock_quantity<=0 then 0 when variant.stock_quantity<=3 then 1 else 2 end as severity,
      coalesce(nullif(variant.image_url,''),image.url,'') as image
    from public.store_product_variants variant
    join public.store_products product on product.id=variant.product_id
    left join lateral (
      select url from public.store_product_images where product_id=product.id order by is_primary desc,sort_order,url limit 1
    ) image on true
    where variant.track_inventory and variant.is_active and variant.stock_quantity<=10
      and (v_term='' or strpos(lower(concat_ws(' ',product.title,variant.title,variant.sku,product.sku)),lower(v_term))>0)
  ), filtered as (
    select * from alerts where p_status='all' or status=p_status
  ), ranked as (
    select *,row_number() over(order by
      case when p_sort='severity' then severity end,
      case when p_sort in ('severity','stock-asc') then stock end,
      case when p_sort='stock-desc' then stock end desc,
      lower(title),product_id,variant_id
    ) as position from filtered
  )
  select jsonb_build_object('total',(select count(*) from filtered),'page',v_page,'pageSize',v_size,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'productId',product_id,'variantId',variant_id,'title',title,'sku',sku,'variant',variant_title,
      'stock',stock,'threshold',10,'status',status,'image',image
    ) order by position) from ranked where position>(v_page-1)*v_size and position<=v_page*v_size),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_dashboard_inventory_alerts(text,text,text,integer,integer) from public, anon;
grant execute on function public.get_dashboard_inventory_alerts(text,text,text,integer,integer) to authenticated;
