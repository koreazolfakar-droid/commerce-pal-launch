alter table public.store_categories
  add column if not exists is_featured boolean not null default false,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

create index if not exists store_categories_featured_sort_idx
  on public.store_categories(is_featured desc, sort_order asc, name asc);

create or replace function public.update_store_category(
  p_category_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_image_url text,
  p_icon text,
  p_sort_order integer,
  p_is_active boolean,
  p_is_featured boolean,
  p_seo_title text,
  p_seo_description text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.store_categories
  set name = p_name,
      slug = p_slug,
      description = nullif(p_description, ''),
      image_url = nullif(p_image_url, ''),
      icon = nullif(p_icon, ''),
      sort_order = p_sort_order,
      is_active = p_is_active,
      is_featured = p_is_featured,
      seo_title = nullif(p_seo_title, ''),
      seo_description = nullif(p_seo_description, ''),
      updated_at = now()
  where id = p_category_id;

  update public.store_products
  set product_type = p_name,
      updated_at = now()
  where category_id = p_category_id;
end;
$$;

grant execute on function public.update_store_category(
  uuid, text, text, text, text, text, integer, boolean, boolean, text, text
) to authenticated;

create or replace function public.delete_store_category(
  p_category_id uuid,
  p_destination_category_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_destination_name text;
begin
  if p_destination_category_id = p_category_id then
    raise exception 'Destination category must be different from the deleted category';
  end if;

  if p_destination_category_id is not null then
    select name into v_destination_name
    from public.store_categories
    where id = p_destination_category_id;

    if v_destination_name is null then
      raise exception 'Destination category does not exist';
    end if;
  end if;

  update public.store_products
  set category_id = p_destination_category_id,
      product_type = v_destination_name,
      updated_at = now()
  where category_id = p_category_id;

  delete from public.store_categories where id = p_category_id;
end;
$$;

grant execute on function public.delete_store_category(uuid, uuid) to authenticated;

create or replace function public.reorder_store_categories(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.store_categories c
  set sort_order = x.sort_order,
      updated_at = now()
  from jsonb_to_recordset(p_items) as x(id uuid, sort_order integer)
  where c.id = x.id;
end;
$$;

grant execute on function public.reorder_store_categories(jsonb) to authenticated;
