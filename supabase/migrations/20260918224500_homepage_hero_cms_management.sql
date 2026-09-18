alter table public.cms_hero_slides
  add column if not exists image_alt_en text,
  add column if not exists image_alt_ar text,
  add column if not exists mobile_image_alt_en text,
  add column if not exists mobile_image_alt_ar text,
  add column if not exists content_alignment text not null default 'start',
  add column if not exists overlay_opacity integer not null default 20,
  add column if not exists button_style text not null default 'primary',
  add column if not exists open_in_new_tab boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='cms_hero_content_alignment_check'
  ) then
    alter table public.cms_hero_slides
      add constraint cms_hero_content_alignment_check
      check (content_alignment in ('start','center','end'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname='cms_hero_overlay_opacity_check'
  ) then
    alter table public.cms_hero_slides
      add constraint cms_hero_overlay_opacity_check
      check (overlay_opacity between 0 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint where conname='cms_hero_button_style_check'
  ) then
    alter table public.cms_hero_slides
      add constraint cms_hero_button_style_check
      check (button_style in ('primary','secondary','light','dark'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname='cms_hero_schedule_check'
  ) then
    alter table public.cms_hero_slides
      add constraint cms_hero_schedule_check
      check (starts_at is null or ends_at is null or ends_at > starts_at);
  end if;
end $$;

create index if not exists cms_hero_slides_publish_schedule_idx
  on public.cms_hero_slides (is_published, sort_order, starts_at, ends_at);

drop policy if exists "dashboard_staff_media_assets" on public.cms_media_assets;
create policy "dashboard_staff_media_assets"
  on public.cms_media_assets
  for all
  to authenticated
  using ((select private.is_dashboard_staff()))
  with check ((select private.is_dashboard_staff()));

grant select, insert, update, delete on public.cms_media_assets to authenticated;

create or replace function private.log_cms_action(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  insert into public.cms_audit_log(actor_email,action,entity_type,entity_id,details)
  values (
    nullif(auth.jwt() ->> 'email',''),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_details,'{}'::jsonb)
  );
end;
$$;

revoke all on function private.log_cms_action(text,text,text,jsonb) from public;

create or replace function public.create_cms_hero_slide(
  p_title_en text default null,
  p_title_ar text default null,
  p_subtitle_en text default null,
  p_subtitle_ar text default null,
  p_image_url text default null,
  p_mobile_image_url text default null,
  p_image_alt_en text default null,
  p_image_alt_ar text default null,
  p_mobile_image_alt_en text default null,
  p_mobile_image_alt_ar text default null,
  p_button_label_en text default null,
  p_button_label_ar text default null,
  p_target_type text default 'none',
  p_target_value text default null,
  p_is_published boolean default false,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_content_alignment text default 'start',
  p_overlay_opacity integer default 20,
  p_button_style text default 'primary',
  p_open_in_new_tab boolean default false
)
returns public.cms_hero_slides
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_slide public.cms_hero_slides%rowtype;
  v_sort integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  if p_target_type not in ('url','product','collection','none') then
    raise exception 'invalid target type';
  end if;
  if p_content_alignment not in ('start','center','end') then
    raise exception 'invalid content alignment';
  end if;
  if p_button_style not in ('primary','secondary','light','dark') then
    raise exception 'invalid button style';
  end if;
  if p_overlay_opacity < 0 or p_overlay_opacity > 90 then
    raise exception 'overlay opacity must be between 0 and 90';
  end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'hero end time must be after start time';
  end if;
  if coalesce(p_is_published,false) and nullif(btrim(coalesce(p_image_url,'')),'') is null then
    raise exception 'published hero requires desktop image';
  end if;

  select coalesce(max(sort_order),-1)+1 into v_sort from public.cms_hero_slides;

  insert into public.cms_hero_slides(
    title,title_en,title_ar,
    subtitle,subtitle_en,subtitle_ar,
    image_url,mobile_image_url,
    image_alt_en,image_alt_ar,mobile_image_alt_en,mobile_image_alt_ar,
    button_label,button_label_en,button_label_ar,
    target_type,target_value,sort_order,is_published,starts_at,ends_at,
    content_alignment,overlay_opacity,button_style,open_in_new_tab
  ) values (
    nullif(btrim(coalesce(p_title_en,'')),''),
    nullif(btrim(coalesce(p_title_en,'')),''),
    nullif(btrim(coalesce(p_title_ar,'')),''),
    nullif(btrim(coalesce(p_subtitle_en,'')),''),
    nullif(btrim(coalesce(p_subtitle_en,'')),''),
    nullif(btrim(coalesce(p_subtitle_ar,'')),''),
    nullif(btrim(coalesce(p_image_url,'')),''),
    nullif(btrim(coalesce(p_mobile_image_url,'')),''),
    nullif(left(btrim(coalesce(p_image_alt_en,'')),300),''),
    nullif(left(btrim(coalesce(p_image_alt_ar,'')),300),''),
    nullif(left(btrim(coalesce(p_mobile_image_alt_en,'')),300),''),
    nullif(left(btrim(coalesce(p_mobile_image_alt_ar,'')),300),''),
    nullif(btrim(coalesce(p_button_label_en,'')),''),
    nullif(btrim(coalesce(p_button_label_en,'')),''),
    nullif(btrim(coalesce(p_button_label_ar,'')),''),
    p_target_type,
    case when p_target_type='none' then null else nullif(btrim(coalesce(p_target_value,'')),'') end,
    v_sort,
    coalesce(p_is_published,false),
    p_starts_at,
    p_ends_at,
    p_content_alignment,
    p_overlay_opacity,
    p_button_style,
    coalesce(p_open_in_new_tab,false)
  )
  returning * into v_slide;

  perform private.log_cms_action(
    'create',
    'hero_slide',
    v_slide.id::text,
    jsonb_build_object('published',v_slide.is_published,'sort_order',v_slide.sort_order)
  );

  return v_slide;
end;
$$;

create or replace function public.update_cms_hero_slide(
  p_slide_id uuid,
  p_title_en text default null,
  p_title_ar text default null,
  p_subtitle_en text default null,
  p_subtitle_ar text default null,
  p_image_url text default null,
  p_mobile_image_url text default null,
  p_image_alt_en text default null,
  p_image_alt_ar text default null,
  p_mobile_image_alt_en text default null,
  p_mobile_image_alt_ar text default null,
  p_button_label_en text default null,
  p_button_label_ar text default null,
  p_target_type text default 'none',
  p_target_value text default null,
  p_is_published boolean default false,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_content_alignment text default 'start',
  p_overlay_opacity integer default 20,
  p_button_style text default 'primary',
  p_open_in_new_tab boolean default false
)
returns public.cms_hero_slides
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_slide public.cms_hero_slides%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  if p_target_type not in ('url','product','collection','none') then
    raise exception 'invalid target type';
  end if;
  if p_content_alignment not in ('start','center','end') then
    raise exception 'invalid content alignment';
  end if;
  if p_button_style not in ('primary','secondary','light','dark') then
    raise exception 'invalid button style';
  end if;
  if p_overlay_opacity < 0 or p_overlay_opacity > 90 then
    raise exception 'overlay opacity must be between 0 and 90';
  end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'hero end time must be after start time';
  end if;
  if coalesce(p_is_published,false) and nullif(btrim(coalesce(p_image_url,'')),'') is null then
    raise exception 'published hero requires desktop image';
  end if;

  update public.cms_hero_slides
  set
    title = nullif(btrim(coalesce(p_title_en,'')),''),
    title_en = nullif(btrim(coalesce(p_title_en,'')),''),
    title_ar = nullif(btrim(coalesce(p_title_ar,'')),''),
    subtitle = nullif(btrim(coalesce(p_subtitle_en,'')),''),
    subtitle_en = nullif(btrim(coalesce(p_subtitle_en,'')),''),
    subtitle_ar = nullif(btrim(coalesce(p_subtitle_ar,'')),''),
    image_url = nullif(btrim(coalesce(p_image_url,'')),''),
    mobile_image_url = nullif(btrim(coalesce(p_mobile_image_url,'')),''),
    image_alt_en = nullif(left(btrim(coalesce(p_image_alt_en,'')),300),''),
    image_alt_ar = nullif(left(btrim(coalesce(p_image_alt_ar,'')),300),''),
    mobile_image_alt_en = nullif(left(btrim(coalesce(p_mobile_image_alt_en,'')),300),''),
    mobile_image_alt_ar = nullif(left(btrim(coalesce(p_mobile_image_alt_ar,'')),300),''),
    button_label = nullif(btrim(coalesce(p_button_label_en,'')),''),
    button_label_en = nullif(btrim(coalesce(p_button_label_en,'')),''),
    button_label_ar = nullif(btrim(coalesce(p_button_label_ar,'')),''),
    target_type = p_target_type,
    target_value = case when p_target_type='none' then null else nullif(btrim(coalesce(p_target_value,'')),'') end,
    is_published = coalesce(p_is_published,false),
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    content_alignment = p_content_alignment,
    overlay_opacity = p_overlay_opacity,
    button_style = p_button_style,
    open_in_new_tab = coalesce(p_open_in_new_tab,false),
    updated_at = now()
  where id=p_slide_id
  returning * into v_slide;

  if v_slide.id is null then raise exception 'hero slide not found'; end if;

  perform private.log_cms_action(
    'update',
    'hero_slide',
    v_slide.id::text,
    jsonb_build_object('published',v_slide.is_published,'sort_order',v_slide.sort_order)
  );

  return v_slide;
end;
$$;

create or replace function public.delete_cms_hero_slide(p_slide_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_sort integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  select sort_order into v_sort from public.cms_hero_slides where id=p_slide_id;
  if v_sort is null then raise exception 'hero slide not found'; end if;

  delete from public.cms_hero_slides where id=p_slide_id;

  perform private.log_cms_action(
    'delete',
    'hero_slide',
    p_slide_id::text,
    jsonb_build_object('sort_order',v_sort)
  );
end;
$$;

create or replace function public.reorder_cms_hero_slides(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  item jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'items must be an array'; end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    update public.cms_hero_slides
    set sort_order=greatest(0,coalesce((item->>'sort_order')::integer,0)),
        updated_at=now()
    where id=(item->>'id')::uuid;
  end loop;

  perform private.log_cms_action(
    'reorder',
    'hero_slide',
    null,
    jsonb_build_object('count',jsonb_array_length(p_items))
  );
end;
$$;

create or replace function public.register_cms_media_asset(
  p_object_path text,
  p_file_name text,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_alt_text text default null
)
returns public.cms_media_assets
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_asset public.cms_media_assets%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  if nullif(btrim(coalesce(p_object_path,'')),'') is null then
    raise exception 'object path required';
  end if;
  if nullif(btrim(coalesce(p_file_name,'')),'') is null then
    raise exception 'file name required';
  end if;

  insert into public.cms_media_assets(
    bucket_id,object_path,file_name,mime_type,size_bytes,alt_text
  ) values (
    'cms-media',
    left(btrim(p_object_path),1000),
    left(btrim(p_file_name),255),
    nullif(left(btrim(coalesce(p_mime_type,'')),150),''),
    case when p_size_bytes is null or p_size_bytes < 0 then null else p_size_bytes end,
    nullif(left(btrim(coalesce(p_alt_text,'')),500),'')
  )
  on conflict (object_path) do update set
    file_name=excluded.file_name,
    mime_type=excluded.mime_type,
    size_bytes=excluded.size_bytes,
    alt_text=excluded.alt_text,
    updated_at=now()
  returning * into v_asset;

  perform private.log_cms_action(
    'upload',
    'media_asset',
    v_asset.id::text,
    jsonb_build_object('object_path',v_asset.object_path,'mime_type',v_asset.mime_type)
  );

  return v_asset;
end;
$$;

revoke all on function public.create_cms_hero_slide(text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,timestamptz,timestamptz,text,integer,text,boolean) from public,anon;
revoke all on function public.update_cms_hero_slide(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,timestamptz,timestamptz,text,integer,text,boolean) from public,anon;
revoke all on function public.delete_cms_hero_slide(uuid) from public,anon;
revoke all on function public.reorder_cms_hero_slides(jsonb) from public,anon;
revoke all on function public.register_cms_media_asset(text,text,text,bigint,text) from public,anon;

grant execute on function public.create_cms_hero_slide(text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,timestamptz,timestamptz,text,integer,text,boolean) to authenticated;
grant execute on function public.update_cms_hero_slide(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,timestamptz,timestamptz,text,integer,text,boolean) to authenticated;
grant execute on function public.delete_cms_hero_slide(uuid) to authenticated;
grant execute on function public.reorder_cms_hero_slides(jsonb) to authenticated;
grant execute on function public.register_cms_media_asset(text,text,text,bigint,text) to authenticated;