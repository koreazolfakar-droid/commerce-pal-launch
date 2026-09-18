create or replace function public.delete_store_brand(
  p_brand_id uuid,
  p_destination_brand_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_destination_brand_id = p_brand_id then
    raise exception 'Destination brand must be different from the deleted brand';
  end if;

  if p_destination_brand_id is not null
     and not exists (select 1 from public.cms_brands where id = p_destination_brand_id) then
    raise exception 'Destination brand does not exist';
  end if;

  update public.store_products
  set brand_id = p_destination_brand_id,
      updated_at = now()
  where brand_id = p_brand_id;

  delete from public.cms_brands where id = p_brand_id;
end;
$$;

grant execute on function public.delete_store_brand(uuid, uuid) to authenticated;

create or replace function public.reorder_store_brands(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.cms_brands b
  set sort_order = x.sort_order,
      updated_at = now()
  from jsonb_to_recordset(p_items) as x(id uuid, sort_order integer)
  where b.id = x.id;
end;
$$;

grant execute on function public.reorder_store_brands(jsonb) to authenticated;
