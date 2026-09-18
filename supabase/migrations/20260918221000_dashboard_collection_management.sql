alter table public.store_collections
  add column if not exists seo_title text,
  add column if not exists seo_description text;

create index if not exists store_collections_active_sort_idx
  on public.store_collections (is_active, sort_order, title);

create index if not exists store_collection_products_collection_sort_idx
  on public.store_collection_products (collection_id, sort_order, product_id);

create or replace function public.create_store_collection(
  p_title text,
  p_handle text,
  p_title_ar text default null,
  p_description text default '',
  p_image_url text default null,
  p_is_active boolean default true,
  p_is_featured boolean default false,
  p_seo_title text default null,
  p_seo_description text default null
)
returns public.store_collections
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_collection public.store_collections%rowtype;
  v_handle text;
  v_next_sort integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if length(btrim(coalesce(p_title,''))) < 2 then raise exception 'collection title required'; end if;

  v_handle := lower(regexp_replace(btrim(coalesce(p_handle,'')), '[^a-zA-Z0-9]+', '-', 'g'));
  v_handle := trim(both '-' from v_handle);
  if v_handle = '' then
    v_handle := lower(regexp_replace(btrim(p_title), '[^a-zA-Z0-9]+', '-', 'g'));
    v_handle := trim(both '-' from v_handle);
  end if;
  if v_handle = '' then raise exception 'valid collection handle required'; end if;

  select coalesce(max(sort_order), -1) + 1 into v_next_sort
  from public.store_collections;

  insert into public.store_collections (
    handle,title,title_ar,description,image_url,sort_order,is_active,is_featured,
    seo_title,seo_description
  ) values (
    left(v_handle,160),
    left(btrim(p_title),160),
    nullif(left(btrim(coalesce(p_title_ar,'')),160),''),
    left(coalesce(p_description,''),5000),
    nullif(left(btrim(coalesce(p_image_url,'')),2000),''),
    v_next_sort,
    coalesce(p_is_active,true),
    coalesce(p_is_featured,false),
    nullif(left(btrim(coalesce(p_seo_title,'')),200),''),
    nullif(left(btrim(coalesce(p_seo_description,'')),500),'')
  )
  returning * into v_collection;

  return v_collection;
exception
  when unique_violation then
    raise exception 'collection handle already exists';
end;
$$;

create or replace function public.update_store_collection(
  p_collection_id uuid,
  p_title text,
  p_handle text,
  p_title_ar text default null,
  p_description text default '',
  p_image_url text default null,
  p_is_active boolean default true,
  p_is_featured boolean default false,
  p_seo_title text default null,
  p_seo_description text default null
)
returns public.store_collections
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_collection public.store_collections%rowtype;
  v_handle text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if length(btrim(coalesce(p_title,''))) < 2 then raise exception 'collection title required'; end if;

  v_handle := lower(regexp_replace(btrim(coalesce(p_handle,'')), '[^a-zA-Z0-9]+', '-', 'g'));
  v_handle := trim(both '-' from v_handle);
  if v_handle = '' then raise exception 'valid collection handle required'; end if;

  update public.store_collections
  set
    handle = left(v_handle,160),
    title = left(btrim(p_title),160),
    title_ar = nullif(left(btrim(coalesce(p_title_ar,'')),160),''),
    description = left(coalesce(p_description,''),5000),
    image_url = nullif(left(btrim(coalesce(p_image_url,'')),2000),''),
    is_active = coalesce(p_is_active,true),
    is_featured = coalesce(p_is_featured,false),
    seo_title = nullif(left(btrim(coalesce(p_seo_title,'')),200),''),
    seo_description = nullif(left(btrim(coalesce(p_seo_description,'')),500),''),
    updated_at = now()
  where id = p_collection_id
  returning * into v_collection;

  if v_collection.id is null then raise exception 'collection not found'; end if;
  return v_collection;
exception
  when unique_violation then
    raise exception 'collection handle already exists';
end;
$$;

create or replace function public.delete_store_collection(p_collection_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  delete from public.store_collections where id=p_collection_id;
  if not found then raise exception 'collection not found'; end if;
end;
$$;

create or replace function public.set_store_collection_products(
  p_collection_id uuid,
  p_product_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  if not exists (select 1 from public.store_collections where id=p_collection_id) then
    raise exception 'collection not found';
  end if;

  select count(*) into v_count
  from unnest(coalesce(p_product_ids,'{}'::uuid[])) product_id
  left join public.store_products p on p.id=product_id
  where p.id is null;
  if v_count > 0 then raise exception 'one or more products do not exist'; end if;

  delete from public.store_collection_products
  where collection_id=p_collection_id
    and product_id <> all(coalesce(p_product_ids,'{}'::uuid[]));

  insert into public.store_collection_products(collection_id,product_id,sort_order)
  select p_collection_id, product_id, ordinality::integer - 1
  from unnest(coalesce(p_product_ids,'{}'::uuid[])) with ordinality as items(product_id,ordinality)
  on conflict (collection_id,product_id) do update
    set sort_order=excluded.sort_order;
end;
$$;

create or replace function public.reorder_store_collections(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  item jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'items must be an array'; end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    update public.store_collections
    set sort_order = greatest(0, coalesce((item->>'sort_order')::integer,0)),
        updated_at = now()
    where id=(item->>'id')::uuid;
  end loop;
end;
$$;

revoke all on function public.create_store_collection(text,text,text,text,text,boolean,boolean,text,text) from public,anon;
revoke all on function public.update_store_collection(uuid,text,text,text,text,text,boolean,boolean,text,text) from public,anon;
revoke all on function public.delete_store_collection(uuid) from public,anon;
revoke all on function public.set_store_collection_products(uuid,uuid[]) from public,anon;
revoke all on function public.reorder_store_collections(jsonb) from public,anon;

grant execute on function public.create_store_collection(text,text,text,text,text,boolean,boolean,text,text) to authenticated;
grant execute on function public.update_store_collection(uuid,text,text,text,text,text,boolean,boolean,text,text) to authenticated;
grant execute on function public.delete_store_collection(uuid) to authenticated;
grant execute on function public.set_store_collection_products(uuid,uuid[]) to authenticated;
grant execute on function public.reorder_store_collections(jsonb) to authenticated;