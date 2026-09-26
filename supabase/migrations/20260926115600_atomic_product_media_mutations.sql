-- Make product media state changes atomic.
-- Dashboard staff may choose one primary image, reorder the full gallery,
-- or delete an image while promoting the next image in the same transaction.

-- Enforce the invariant at the database layer as well as in the RPCs.
-- Current production data has at most one primary image per product.
create unique index if not exists store_product_images_one_primary_uidx
  on public.store_product_images (product_id)
  where is_primary = true;

create or replace function public.set_store_product_primary_image(
  p_product_id uuid,
  p_image_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  perform 1
  from public.store_products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'product not found';
  end if;

  if not exists (
    select 1
    from public.store_product_images
    where id = p_image_id
      and product_id = p_product_id
  ) then
    raise exception 'product image not found';
  end if;

  update public.store_product_images
  set is_primary = false
  where product_id = p_product_id
    and is_primary;

  update public.store_product_images
  set is_primary = true
  where id = p_image_id
    and product_id = p_product_id;
end;
$$;

create or replace function public.reorder_store_product_images(
  p_product_id uuid,
  p_image_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_total integer;
  v_distinct integer;
  v_item record;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  perform 1
  from public.store_products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'product not found';
  end if;

  select count(*)::integer
  into v_total
  from public.store_product_images
  where product_id = p_product_id;

  select count(distinct image_id)::integer
  into v_distinct
  from unnest(coalesce(p_image_ids, '{}'::uuid[])) as requested(image_id);

  if coalesce(cardinality(p_image_ids), 0) <> v_total
     or v_distinct <> v_total then
    raise exception 'image reorder must contain every product image exactly once';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_image_ids, '{}'::uuid[])) as requested(image_id)
    left join public.store_product_images image
      on image.id = requested.image_id
     and image.product_id = p_product_id
    where image.id is null
  ) then
    raise exception 'image reorder contains an invalid product image';
  end if;

  for v_item in
    select image_id, ordinality
    from unnest(p_image_ids) with ordinality as requested(image_id, ordinality)
  loop
    update public.store_product_images
    set sort_order = v_item.ordinality::integer - 1
    where id = v_item.image_id
      and product_id = p_product_id;
  end loop;
end;
$$;

create or replace function public.delete_store_product_image(
  p_product_id uuid,
  p_image_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_was_primary boolean;
  v_promoted_id uuid;
begin
  if auth.uid() is null or not private.is_dashboard_staff() then
    raise exception 'dashboard staff required';
  end if;

  perform 1
  from public.store_products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'product not found';
  end if;

  delete from public.store_product_images
  where id = p_image_id
    and product_id = p_product_id
  returning is_primary into v_was_primary;

  if not found then
    raise exception 'product image not found';
  end if;

  if v_was_primary then
    select id
    into v_promoted_id
    from public.store_product_images
    where product_id = p_product_id
    order by sort_order asc, created_at asc, id asc
    limit 1
    for update;

    if v_promoted_id is not null then
      update public.store_product_images
      set is_primary = true
      where id = v_promoted_id;
    end if;
  end if;

  return v_promoted_id;
end;
$$;

revoke all on function public.set_store_product_primary_image(uuid, uuid) from public, anon;
revoke all on function public.reorder_store_product_images(uuid, uuid[]) from public, anon;
revoke all on function public.delete_store_product_image(uuid, uuid) from public, anon;

grant execute on function public.set_store_product_primary_image(uuid, uuid) to authenticated;
grant execute on function public.reorder_store_product_images(uuid, uuid[]) to authenticated;
grant execute on function public.delete_store_product_image(uuid, uuid) to authenticated;
