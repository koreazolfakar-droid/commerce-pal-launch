create or replace function private.validate_cms_hero_target(
  p_target_type text,
  p_target_value text,
  p_is_published boolean
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_value text := btrim(coalesce(p_target_value,''));
begin
  if p_target_type = 'none' then
    return;
  end if;

  if v_value = '' then
    raise exception 'hero target value required';
  end if;

  if p_target_type = 'url' then
    if not (
      v_value like '/%' or
      v_value ~* '^https?://'
    ) then
      raise exception 'hero URL must be an internal path or HTTP(S) URL';
    end if;
    return;
  end if;

  if p_target_type = 'product' then
    if not exists (
      select 1
      from public.store_products p
      where p.handle = v_value
        and (not coalesce(p_is_published,false) or p.status = 'active')
    ) then
      raise exception 'hero product target not found or not active';
    end if;
    return;
  end if;

  if p_target_type = 'collection' then
    if not exists (
      select 1
      from public.store_collections c
      where c.handle = v_value
        and (not coalesce(p_is_published,false) or c.is_active = true)
    ) then
      raise exception 'hero collection target not found or not active';
    end if;
    return;
  end if;

  raise exception 'invalid target type';
end;
$$;

revoke all on function private.validate_cms_hero_target(text,text,boolean) from public;
grant execute on function private.validate_cms_hero_target(text,text,boolean) to authenticated;

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

  if p_target_type not in ('url','product','collection','none') then raise exception 'invalid target type'; end if;
  if p_content_alignment not in ('start','center','end') then raise exception 'invalid content alignment'; end if;
  if p_button_style not in ('primary','secondary','light','dark') then raise exception 'invalid button style'; end if;
  if p_overlay_opacity < 0 or p_overlay_opacity > 90 then raise exception 'overlay opacity must be between 0 and 90'; end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then raise exception 'hero end time must be after start time'; end if;
  if coalesce(p_is_published,false) and nullif(btrim(coalesce(p_image_url,'')),'') is null then raise exception 'published hero requires desktop image'; end if;
  if nullif(btrim(coalesce(p_image_url,'')),'') is not null and p_image_url !~* '^https://' then raise exception 'hero desktop image must use HTTPS'; end if;
  if nullif(btrim(coalesce(p_mobile_image_url,'')),'') is not null and p_mobile_image_url !~* '^https://' then raise exception 'hero mobile image must use HTTPS'; end if;

  perform private.validate_cms_hero_target(p_target_type,p_target_value,p_is_published);

  select coalesce(max(sort_order),-1)+1 into v_sort from public.cms_hero_slides;

  insert into public.cms_hero_slides(
    title,title_en,title_ar,subtitle,subtitle_en,subtitle_ar,
    image_url,mobile_image_url,image_alt_en,image_alt_ar,mobile_image_alt_en,mobile_image_alt_ar,
    button_label,button_label_en,button_label_ar,target_type,target_value,sort_order,is_published,
    starts_at,ends_at,content_alignment,overlay_opacity,button_style,open_in_new_tab
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
    v_sort,coalesce(p_is_published,false),p_starts_at,p_ends_at,p_content_alignment,p_overlay_opacity,
    p_button_style,coalesce(p_open_in_new_tab,false)
  )
  returning * into v_slide;

  perform private.log_cms_action(
    'create','hero_slide',v_slide.id::text,
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

  if p_target_type not in ('url','product','collection','none') then raise exception 'invalid target type'; end if;
  if p_content_alignment not in ('start','center','end') then raise exception 'invalid content alignment'; end if;
  if p_button_style not in ('primary','secondary','light','dark') then raise exception 'invalid button style'; end if;
  if p_overlay_opacity < 0 or p_overlay_opacity > 90 then raise exception 'overlay opacity must be between 0 and 90'; end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then raise exception 'hero end time must be after start time'; end if;
  if coalesce(p_is_published,false) and nullif(btrim(coalesce(p_image_url,'')),'') is null then raise exception 'published hero requires desktop image'; end if;
  if nullif(btrim(coalesce(p_image_url,'')),'') is not null and p_image_url !~* '^https://' then raise exception 'hero desktop image must use HTTPS'; end if;
  if nullif(btrim(coalesce(p_mobile_image_url,'')),'') is not null and p_mobile_image_url !~* '^https://' then raise exception 'hero mobile image must use HTTPS'; end if;

  perform private.validate_cms_hero_target(p_target_type,p_target_value,p_is_published);

  update public.cms_hero_slides
  set
    title=nullif(btrim(coalesce(p_title_en,'')),''),
    title_en=nullif(btrim(coalesce(p_title_en,'')),''),
    title_ar=nullif(btrim(coalesce(p_title_ar,'')),''),
    subtitle=nullif(btrim(coalesce(p_subtitle_en,'')),''),
    subtitle_en=nullif(btrim(coalesce(p_subtitle_en,'')),''),
    subtitle_ar=nullif(btrim(coalesce(p_subtitle_ar,'')),''),
    image_url=nullif(btrim(coalesce(p_image_url,'')),''),
    mobile_image_url=nullif(btrim(coalesce(p_mobile_image_url,'')),''),
    image_alt_en=nullif(left(btrim(coalesce(p_image_alt_en,'')),300),''),
    image_alt_ar=nullif(left(btrim(coalesce(p_image_alt_ar,'')),300),''),
    mobile_image_alt_en=nullif(left(btrim(coalesce(p_mobile_image_alt_en,'')),300),''),
    mobile_image_alt_ar=nullif(left(btrim(coalesce(p_mobile_image_alt_ar,'')),300),''),
    button_label=nullif(btrim(coalesce(p_button_label_en,'')),''),
    button_label_en=nullif(btrim(coalesce(p_button_label_en,'')),''),
    button_label_ar=nullif(btrim(coalesce(p_button_label_ar,'')),''),
    target_type=p_target_type,
    target_value=case when p_target_type='none' then null else nullif(btrim(coalesce(p_target_value,'')),'') end,
    is_published=coalesce(p_is_published,false),
    starts_at=p_starts_at,ends_at=p_ends_at,content_alignment=p_content_alignment,
    overlay_opacity=p_overlay_opacity,button_style=p_button_style,
    open_in_new_tab=coalesce(p_open_in_new_tab,false),updated_at=now()
  where id=p_slide_id
  returning * into v_slide;

  if v_slide.id is null then raise exception 'hero slide not found'; end if;

  perform private.log_cms_action(
    'update','hero_slide',v_slide.id::text,
    jsonb_build_object('published',v_slide.is_published,'sort_order',v_slide.sort_order)
  );

  return v_slide;
end;
$$;