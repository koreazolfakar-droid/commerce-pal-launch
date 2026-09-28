-- Consolidate Dashboard read-heavy operations, add safe covering indexes,
-- remove redundant permissive SELECT policies, and enable targeted Realtime
-- invalidation for orders/inventory. All RPCs are SECURITY INVOKER and require
-- an authenticated Dashboard staff session.

create or replace function public.search_dashboard_products(
  p_query text,
  p_limit integer default 8
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
set search_path = public, private, pg_temp
as $$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 8), 20));
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  if v_query = '' then
    return;
  end if;

  return query
  select
    p.id,
    p.title,
    coalesce(b.name, ''),
    coalesce(c.name, p.product_type, ''),
    coalesce(v.sku, p.sku, '')
  from public.store_products p
  left join public.cms_brands b on b.id = p.brand_id
  left join public.store_categories c on c.id = p.category_id
  left join lateral (
    select pv.sku
    from public.store_product_variants pv
    where pv.product_id = p.id
      and pv.is_active = true
    order by pv.sort_order asc, pv.created_at asc
    limit 1
  ) v on true
  where
    position(v_query in lower(coalesce(p.title, ''))) > 0
    or position(v_query in lower(coalesce(p.sku, ''))) > 0
    or position(v_query in lower(coalesce(v.sku, ''))) > 0
    or position(v_query in lower(coalesce(b.name, ''))) > 0
    or position(v_query in lower(coalesce(c.name, ''))) > 0
  order by
    case
      when lower(coalesce(p.title, '')) = v_query then 0
      when left(lower(coalesce(p.title, '')), char_length(v_query)) = v_query then 1
      when lower(coalesce(v.sku, p.sku, '')) = v_query then 2
      else 3
    end,
    p.updated_at desc,
    p.id
  limit v_limit;
end;
$$;

revoke all on function public.search_dashboard_products(text,integer)
from public, anon;
grant execute on function public.search_dashboard_products(text,integer)
to authenticated;


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
    count(*) filter (where o.status = 'new')::bigint,
    count(*) filter (where o.status = 'confirmed')::bigint,
    count(*) filter (where o.status = 'processing')::bigint,
    count(*) filter (where o.status = 'ready')::bigint,
    count(*) filter (where o.status = 'out_for_delivery')::bigint,
    count(*) filter (where o.status = 'delivered')::bigint,
    count(*) filter (where o.status = 'done')::bigint,
    count(*) filter (where o.status = 'cancelled')::bigint
  from public.store_orders o;
end;
$$;

revoke all on function public.get_dashboard_order_stats()
from public, anon;
grant execute on function public.get_dashboard_order_stats()
to authenticated;


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
  v_snapshot jsonb;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;
  if p_start is null or p_end is null or p_start > p_end then
    raise exception 'invalid dashboard snapshot range';
  end if;
  if p_end - p_start > interval '90 days' then
    raise exception 'dashboard snapshot range is too large';
  end if;

  with
  period_sales as (
    select s.order_id, s.payment_status, s.total, s.completed_at
    from public.store_sales s
    where s.completed_at >= p_start
      and s.completed_at <= p_end
      and s.payment_status in ('paid', 'partially_refunded')
  ),
  metrics as (
    select
      (select count(*) from public.store_products)::bigint as product_count,
      (select count(*) from public.store_products p where p.status = 'active')::bigint as active_product_count,
      (select count(*) from public.store_customers)::bigint as customer_count,
      (select count(*) from public.cms_brands b where b.is_visible = true)::bigint as visible_brand_count,
      (
        select coalesce(sum(v.stock_quantity), 0)::bigint
        from public.store_product_variants v
        where v.track_inventory = true and v.is_active = true
      ) as total_units,
      (
        select count(*)::bigint
        from public.store_product_variants v
        where v.track_inventory = true
          and v.is_active = true
          and v.stock_quantity between 1 and 10
      ) as low_stock_variants,
      (
        select count(*)::bigint
        from public.store_product_variants v
        where v.track_inventory = true
          and v.is_active = true
          and v.stock_quantity <= 0
      ) as out_of_stock_variants,
      (
        select count(*)::bigint
        from public.store_orders o
        where o.created_at >= p_start and o.created_at <= p_end
      ) as period_order_count,
      (
        select coalesce(sum(ps.total), 0)::numeric
        from period_sales ps
      ) as total_sales
  ),
  recent_orders as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'orderNumber', r.public_order_number,
          'customer', r.customer_name,
          'total', r.total,
          'currency', r.currency,
          'status', r.status,
          'paymentStatus', r.payment_status,
          'createdAt', r.created_at
        )
        order by r.created_at desc
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        o.id,
        o.public_order_number,
        o.customer_name,
        o.total,
        o.currency,
        o.status,
        o.payment_status,
        o.created_at
      from public.store_orders o
      order by o.created_at desc
      limit 6
    ) r
  ),
  order_daily as (
    select date_trunc('day', o.created_at) as day, count(*)::bigint as orders
    from public.store_orders o
    where o.created_at >= p_start and o.created_at <= p_end
    group by 1
  ),
  sale_daily as (
    select date_trunc('day', ps.completed_at) as day, coalesce(sum(ps.total), 0)::numeric as revenue
    from period_sales ps
    group by 1
  ),
  trend as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', to_char(series.day, 'YYYY-MM-DD'),
          'label', to_char(series.day, 'Mon DD'),
          'revenue', round(coalesce(sd.revenue, 0)::numeric, 2),
          'orders', coalesce(od.orders, 0)
        )
        order by series.day
      ),
      '[]'::jsonb
    ) as value
    from generate_series(
      date_trunc('day', p_start),
      date_trunc('day', p_end),
      interval '1 day'
    ) as series(day)
    left join order_daily od on od.day = series.day
    left join sale_daily sd on sd.day = series.day
  ),
  sale_items as (
    select
      oi.product_id,
      oi.title,
      oi.quantity,
      oi.line_total
    from period_sales ps
    join public.store_order_items oi on oi.order_id = ps.order_id
  ),
  top_product_rows as (
    select
      si.product_id,
      si.title,
      sum(si.quantity)::bigint as quantity,
      coalesce(sum(si.line_total), 0)::numeric as revenue
    from sale_items si
    group by si.product_id, si.title
    order by quantity desc, revenue desc, si.title
    limit 5
  ),
  top_products as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'productId', tpr.product_id,
          'title', tpr.title,
          'quantity', tpr.quantity,
          'revenue', round(tpr.revenue, 2)
        )
        order by tpr.quantity desc, tpr.revenue desc
      ),
      '[]'::jsonb
    ) as value
    from top_product_rows tpr
  ),
  brand_rows as (
    select
      p.brand_id,
      b.name,
      coalesce(sum(si.line_total), 0)::numeric as revenue
    from sale_items si
    join public.store_products p on p.id = si.product_id
    join public.cms_brands b on b.id = p.brand_id
    where p.brand_id is not null
    group by p.brand_id, b.name
  ),
  brand_ranked as (
    select
      br.*,
      sum(br.revenue) over () as total_revenue
    from brand_rows br
  ),
  top_brands as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'brandId', x.brand_id,
          'name', x.name,
          'revenue', round(x.revenue, 2),
          'share',
            case
              when x.total_revenue > 0
                then round((x.revenue / x.total_revenue) * 100, 1)
              else 0
            end
        )
        order by x.revenue desc
      ),
      '[]'::jsonb
    ) as value
    from (
      select *
      from brand_ranked
      order by revenue desc, name
      limit 5
    ) x
  )
  select jsonb_build_object(
    'periodStart', p_start,
    'periodEnd', p_end,
    'totalSales', round(m.total_sales, 2),
    'ordersLast30Days', m.period_order_count,
    'customerCount', m.customer_count,
    'productCount', m.product_count,
    'activeProductCount', m.active_product_count,
    'totalUnits', m.total_units,
    'lowStockVariants', m.low_stock_variants,
    'outOfStockVariants', m.out_of_stock_variants,
    'visibleBrandCount', m.visible_brand_count,
    'recentOrders', ro.value,
    'trend', tr.value,
    'topProducts', tp.value,
    'topBrands', tb.value
  )
  into v_snapshot
  from metrics m
  cross join recent_orders ro
  cross join trend tr
  cross join top_products tp
  cross join top_brands tb;

  return coalesce(v_snapshot, '{}'::jsonb);
end;
$$;

revoke all on function public.get_dashboard_home_snapshot(timestamptz,timestamptz)
from public, anon;
grant execute on function public.get_dashboard_home_snapshot(timestamptz,timestamptz)
to authenticated;


-- Cover foreign-key columns flagged by the database advisor.
create index if not exists store_catalog_audit_log_changed_by_fk_idx
  on public.store_catalog_audit_log(changed_by);
create index if not exists store_order_items_product_fk_idx
  on public.store_order_items(product_id);
create index if not exists store_order_items_variant_fk_idx
  on public.store_order_items(variant_id);
create index if not exists store_procurement_attachments_uploaded_by_fk_idx
  on public.store_procurement_attachments(uploaded_by);
create index if not exists store_procurement_events_actor_fk_idx
  on public.store_procurement_events(actor_id);
create index if not exists store_procurement_locations_created_by_fk_idx
  on public.store_procurement_locations(created_by);
create index if not exists store_purchase_order_items_product_fk_idx
  on public.store_purchase_order_items(product_id);
create index if not exists store_purchase_orders_approved_by_fk_idx
  on public.store_purchase_orders(approved_by);
create index if not exists store_purchase_orders_cancelled_by_fk_idx
  on public.store_purchase_orders(cancelled_by);
create index if not exists store_purchase_orders_created_by_fk_idx
  on public.store_purchase_orders(created_by);
create index if not exists store_purchase_orders_rejected_by_fk_idx
  on public.store_purchase_orders(rejected_by);
create index if not exists store_receiving_serials_created_by_fk_idx
  on public.store_receiving_serials(created_by);
create index if not exists store_receivings_approved_by_fk_idx
  on public.store_receivings(approved_by);
create index if not exists store_suppliers_created_by_fk_idx
  on public.store_suppliers(created_by);


-- Replace overlapping permissive SELECT policies with one policy per role.
drop policy if exists cms_brands_public_read on public.cms_brands;
drop policy if exists dashboard_staff_brands_select on public.cms_brands;
drop policy if exists cms_brands_public_read_anon on public.cms_brands;
drop policy if exists cms_brands_authenticated_read on public.cms_brands;
create policy cms_brands_public_read_anon
on public.cms_brands for select to anon
using (is_visible);
create policy cms_brands_authenticated_read
on public.cms_brands for select to authenticated
using (is_visible or (select private.is_dashboard_staff()));

drop policy if exists store_categories_public_read on public.store_categories;
drop policy if exists store_categories_staff_select on public.store_categories;
drop policy if exists store_categories_public_read_anon on public.store_categories;
drop policy if exists store_categories_authenticated_read on public.store_categories;
create policy store_categories_public_read_anon
on public.store_categories for select to anon
using (is_active);
create policy store_categories_authenticated_read
on public.store_categories for select to authenticated
using (is_active or (select private.is_dashboard_staff()));

drop policy if exists store_collections_public_read on public.store_collections;
drop policy if exists store_collections_staff_read on public.store_collections;
drop policy if exists store_collections_public_read_anon on public.store_collections;
drop policy if exists store_collections_authenticated_read on public.store_collections;
create policy store_collections_public_read_anon
on public.store_collections for select to anon
using (is_active);
create policy store_collections_authenticated_read
on public.store_collections for select to authenticated
using (is_active or (select private.is_dashboard_staff()));

drop policy if exists store_collection_products_public_read on public.store_collection_products;
drop policy if exists store_collection_products_staff_read on public.store_collection_products;
drop policy if exists store_collection_products_public_read_anon on public.store_collection_products;
drop policy if exists store_collection_products_authenticated_read on public.store_collection_products;
create policy store_collection_products_public_read_anon
on public.store_collection_products for select to anon
using (
  exists (
    select 1 from public.store_collections c
    where c.id = store_collection_products.collection_id
      and c.is_active
  )
  and exists (
    select 1 from public.store_products p
    where p.id = store_collection_products.product_id
      and p.status = 'active'
      and (p.published_at is null or p.published_at <= now())
  )
);
create policy store_collection_products_authenticated_read
on public.store_collection_products for select to authenticated
using (
  (
    exists (
      select 1 from public.store_collections c
      where c.id = store_collection_products.collection_id
        and c.is_active
    )
    and exists (
      select 1 from public.store_products p
      where p.id = store_collection_products.product_id
        and p.status = 'active'
        and (p.published_at is null or p.published_at <= now())
    )
  )
  or (select private.is_dashboard_staff())
);


-- Split ALL policies so SELECT is not evaluated twice.
drop policy if exists store_procurement_locations_staff_write on public.store_procurement_locations;
drop policy if exists store_procurement_locations_staff_insert on public.store_procurement_locations;
drop policy if exists store_procurement_locations_staff_update on public.store_procurement_locations;
drop policy if exists store_procurement_locations_staff_delete on public.store_procurement_locations;
create policy store_procurement_locations_staff_insert
on public.store_procurement_locations for insert to authenticated
with check ((select private.is_dashboard_staff()));
create policy store_procurement_locations_staff_update
on public.store_procurement_locations for update to authenticated
using ((select private.is_dashboard_staff()))
with check ((select private.is_dashboard_staff()));
create policy store_procurement_locations_staff_delete
on public.store_procurement_locations for delete to authenticated
using ((select private.is_dashboard_staff()));

drop policy if exists store_receiving_serials_staff_write_draft on public.store_receiving_serials;
drop policy if exists store_receiving_serials_staff_insert_draft on public.store_receiving_serials;
drop policy if exists store_receiving_serials_staff_update_draft on public.store_receiving_serials;
drop policy if exists store_receiving_serials_staff_delete_draft on public.store_receiving_serials;
create policy store_receiving_serials_staff_insert_draft
on public.store_receiving_serials for insert to authenticated
with check (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receiving_items ri
    join public.store_receivings r on r.id = ri.receiving_id
    where ri.id = store_receiving_serials.receiving_item_id
      and r.status = 'draft'
  )
);
create policy store_receiving_serials_staff_update_draft
on public.store_receiving_serials for update to authenticated
using (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receiving_items ri
    join public.store_receivings r on r.id = ri.receiving_id
    where ri.id = store_receiving_serials.receiving_item_id
      and r.status = 'draft'
  )
)
with check (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receiving_items ri
    join public.store_receivings r on r.id = ri.receiving_id
    where ri.id = store_receiving_serials.receiving_item_id
      and r.status = 'draft'
  )
);
create policy store_receiving_serials_staff_delete_draft
on public.store_receiving_serials for delete to authenticated
using (
  (select private.is_dashboard_staff())
  and exists (
    select 1
    from public.store_receiving_items ri
    join public.store_receivings r on r.id = ri.receiving_id
    where ri.id = store_receiving_serials.receiving_item_id
      and r.status = 'draft'
  )
);


-- Enable Postgres Changes only for the operational tables the Dashboard watches.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'store_orders'
  ) then
    alter publication supabase_realtime add table public.store_orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'store_product_variants'
  ) then
    alter publication supabase_realtime add table public.store_product_variants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'store_inventory_movements'
  ) then
    alter publication supabase_realtime add table public.store_inventory_movements;
  end if;
end;
$$;

comment on function public.search_dashboard_products(text,integer) is
  'Server-side Dashboard product search with bounded results.';
comment on function public.get_dashboard_order_stats() is
  'Single-query Dashboard order status counters.';
comment on function public.get_dashboard_home_snapshot(timestamptz,timestamptz) is
  'Server-side Dashboard home aggregate snapshot for a bounded period.';
