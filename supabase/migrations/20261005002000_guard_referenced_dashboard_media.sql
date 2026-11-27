-- Detect storage URLs recursively, including nested CMS settings and encoded paths.
create or replace function private.dashboard_decode_url_path(p_value text)
returns text language plpgsql immutable set search_path = '' as $$
declare v_bytes bytea := ''::bytea; v_position integer := 1; v_char text;
begin
  while v_position <= length(p_value) loop
    v_char := substr(p_value, v_position, 1);
    if v_char = '%' and substr(p_value, v_position + 1, 2) ~ '^[0-9a-fA-F]{2}$' then
      v_bytes := v_bytes || decode(substr(p_value, v_position + 1, 2), 'hex');
      v_position := v_position + 3;
    else
      v_bytes := v_bytes || convert_to(v_char, 'UTF8');
      v_position := v_position + 1;
    end if;
  end loop;
  return convert_from(v_bytes, 'UTF8');
exception when others then return p_value;
end;
$$;

create or replace function private.dashboard_document_uses_media(p_document jsonb, p_bucket text, p_path text)
returns boolean language sql immutable set search_path = '' as $$
 select exists (
   select 1 from jsonb_path_query(p_document, '$.**') as node(value)
   where jsonb_typeof(value) = 'string'
     and private.dashboard_decode_url_path(regexp_replace(
       split_part(split_part(value #>> '{}', '?', 1), '#', 1),
       '^.*?/storage/v1/object/(public|sign|authenticated)/', ''
     )) = p_bucket || '/' || p_path
 )
$$;

create or replace function public.get_dashboard_media_usage(p_asset_id uuid)
returns table(source text, record_id text) language plpgsql security invoker
set search_path = public, private, pg_temp as $$
declare v_asset public.cms_media_assets%rowtype; v_table text;
begin
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  select * into v_asset from public.cms_media_assets where id = p_asset_id;
  if not found then raise exception 'media asset not found'; end if;
  foreach v_table in array array[
    'store_product_images','store_product_variants','store_categories','store_collections',
    'cms_brands','cms_hero_slides','cms_sections','cms_seo_pages',
    'cms_navigation_items','cms_site_settings','cms_settings'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      return query execute format(
        'select %L::text, coalesce(to_jsonb(r)->>''id'',to_jsonb(r)->>''key'',to_jsonb(r)->>''page_slug'',''content'') from public.%I r where private.dashboard_document_uses_media(to_jsonb(r),$1,$2)',
        v_table, v_table
      ) using v_asset.bucket_id, v_asset.object_path;
    end if;
  end loop;
end;
$$;
revoke all on function public.get_dashboard_media_usage(uuid) from public, anon;
grant execute on function public.get_dashboard_media_usage(uuid) to authenticated;

create or replace function private.guard_dashboard_media_delete()
returns trigger language plpgsql security invoker set search_path = public, private, pg_temp as $$
begin
  if exists(select 1 from public.get_dashboard_media_usage(old.id)) then
    raise exception 'media_asset_in_use';
  end if;
  return old;
end;
$$;
drop trigger if exists guard_dashboard_media_delete on public.cms_media_assets;
create trigger guard_dashboard_media_delete before delete on public.cms_media_assets
for each row execute function private.guard_dashboard_media_delete();
