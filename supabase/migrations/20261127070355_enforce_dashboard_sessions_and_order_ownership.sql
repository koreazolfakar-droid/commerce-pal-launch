-- A signed access token may outlive its session after logout. Check the
-- session behind either accepted staff second factor before granting access.
create function private.has_live_dashboard_session()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
      and s.user_id = (select auth.uid())
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function private.has_live_dashboard_session() from public, anon, authenticated;

create or replace function private.has_dashboard_aal2()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and (select private.has_live_dashboard_session());
$$;

create or replace function private.has_dashboard_passkey_stepup()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_live_dashboard_session()) and exists (
    select 1
    from public.dashboard_passkey_session_assurance assurance
    where assurance.user_id = (select auth.uid())
      and assurance.session_id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
      and assurance.expires_at > now()
  );
$$;

-- Older permissive policies are ORed with the dashboard policies. Role
-- management must go through the current admin and self-enrollment rules.
drop policy if exists "admins manage roles" on public.user_roles;
drop policy if exists "admins read all roles" on public.user_roles;

-- Legacy CMS and media policies call these functions. Use the same live MFA
-- check and let the existing user_roles RLS govern which roles may be read.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select (select private.is_dashboard_staff()) and exists (
    select 1 from public.user_roles r where r.user_id = _user_id and r.role = _role
  );
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select (select private.is_dashboard_staff()) and exists (
    select 1 from public.user_roles r where r.user_id = _user_id and r.role in ('admin', 'editor')
  );
$$;

create or replace function private.dashboard_inventory_page_impl(
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
set search_path to ''
as $function$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_threshold integer := greatest(coalesce(p_threshold, 10), 0);
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(100, greatest(coalesce(p_page_size, 20), 1));
begin
  if not private.is_dashboard_staff() then
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

create or replace function private.dashboard_inventory_summary_impl(
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
set search_path to ''
as $function$
declare
  v_threshold integer := greatest(coalesce(p_threshold, 10), 0);
begin
  if not private.is_dashboard_staff() then
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

create or replace function public.create_store_order_for_customer_internal(
  payload jsonb,
  p_customer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_result jsonb;
  v_order_id uuid;
  v_existing_customer_user_id uuid;
begin
  if p_customer_user_id is null then
    raise exception 'authentication_required';
  end if;

  -- Reuse the established pricing, inventory, idempotency and audit workflow.
  -- Because this call and the account link happen inside the same PostgreSQL
  -- function invocation, any failure below rolls back the order creation too.
  v_result := public.create_store_order_internal(payload);

  begin
    v_order_id := (v_result ->> 'order_id')::uuid;
  exception when others then
    raise exception 'invalid_order_response';
  end;

  select customer_user_id
  into v_existing_customer_user_id
  from public.store_orders
  where id = v_order_id
  for update;

  if not found then
    raise exception 'order_not_found_after_create';
  end if;

  -- Only the transaction that created a new order can attach its owner.
  -- A retry must already belong to the same authenticated customer.
  if (v_result -> 'replayed') = 'false'::jsonb and v_existing_customer_user_id is null then
    update public.store_orders
    set customer_user_id = p_customer_user_id
    where id = v_order_id;
  elsif v_existing_customer_user_id is distinct from p_customer_user_id then
    raise exception 'order_account_conflict';
  end if;

  return v_result;
end;
$function$;

revoke all on function public.create_store_order_for_customer_internal(jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_store_order_for_customer_internal(jsonb, uuid)
  to service_role;
