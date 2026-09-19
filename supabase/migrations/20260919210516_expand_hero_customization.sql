alter table public.cms_hero_slides
  add column if not exists eyebrow_en text,
  add column if not exists eyebrow_ar text,
  add column if not exists secondary_button_label_en text,
  add column if not exists secondary_button_label_ar text,
  add column if not exists secondary_target_type text not null default 'none',
  add column if not exists secondary_target_value text,
  add column if not exists secondary_button_style text not null default 'secondary',
  add column if not exists content_theme text not null default 'light',
  add column if not exists secondary_open_in_new_tab boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cms_hero_secondary_target_type_check'
      and conrelid = 'public.cms_hero_slides'::regclass
  ) then
    alter table public.cms_hero_slides
      add constraint cms_hero_secondary_target_type_check
      check (secondary_target_type in ('url','product','collection','none'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cms_hero_secondary_button_style_check'
      and conrelid = 'public.cms_hero_slides'::regclass
  ) then
    alter table public.cms_hero_slides
      add constraint cms_hero_secondary_button_style_check
      check (secondary_button_style in ('primary','secondary','light','dark'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cms_hero_content_theme_check'
      and conrelid = 'public.cms_hero_slides'::regclass
  ) then
    alter table public.cms_hero_slides
      add constraint cms_hero_content_theme_check
      check (content_theme in ('light','dark','glass'));
  end if;
end
$$;

create or replace function public.create_cms_hero_slide_v2(
  p_title_en text default null,
  p_title_ar text default null,
  p_subtitle_en text default null,
  p_subtitle_ar text default null,
  p_eyebrow_en text default null,
  p_eyebrow_ar text default null,
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
  p_secondary_button_label_en text default null,
  p_secondary_button_label_ar text default null,
  p_secondary_target_type text default 'none',
  p_secondary_target_value text default null,
  p_is_published boolean default false,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_content_alignment text default 'start',
  p_overlay_opacity integer default 20,
  p_button_style text default 'primary',
  p_secondary_button_style text default 'secondary',
  p_content_theme text default 'light',
  p_open_in_new_tab boolean default false,
  p_secondary_open_in_new_tab boolean default false
)
returns public.cms_hero_slides
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_slide public.cms_hero_slides%rowtype;
  v_sort integer;
  v_has_secondary_label boolean :=
    nullif(btrim(coalesce(p_secondary_button_label_en,'')),'') is not null
    or nullif(btrim(coalesce(p_secondary_button_label_ar,'')),'') is not null;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  if p_target_type not in ('url','product','collection','none') then raise exception 'invalid target type'; end if;
  if p_secondary_target_type not in ('url','product','collection','none') then raise exception 'invalid secondary target type'; end if;
  if p_content_alignment not in ('start','center','end') then raise exception 'invalid content alignment'; end if;
  if p_button_style not in ('primary','secondary','light','dark') then raise exception 'invalid button style'; end if;
  if p_secondary_button_style not in ('primary','secondary','light','dark') then raise exception 'invalid secondary button style'; end if;
  if p_content_theme not in ('light','dark','glass') then raise exception 'invalid content theme'; end if;
  if p_overlay_opacity < 0 or p_overlay_opacity > 90 then raise exception 'overlay opacity must be between 0 and 90'; end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then raise exception 'hero end time must be after start time'; end if;
  if coalesce(p_is_published,false) and nullif(btrim(coalesce(p_image_url,'')),'') is null then raise exception 'published hero requires desktop image'; end if;
  if nullif(btrim(coalesce(p_image_url,'')),'') is not null and p_image_url !~* '^https://' then raise exception 'hero desktop image must use HTTPS'; end if;
  if nullif(btrim(coalesce(p_mobile_image_url,'')),'') is not null and p_mobile_image_url !~* '^https://' then raise exception 'hero mobile image must use HTTPS'; end if;

  perform private.validate_cms_hero_target(p_target_type,p_target_value,p_is_published);

  if p_secondary_target_type <> 'none' then
    perform private.validate_cms_hero_target(p_secondary_target_type,p_secondary_target_value,p_is_published);
  elsif coalesce(p_is_published,false) and v_has_secondary_label then
    raise exception 'published secondary hero button requires a target';
  end if;

  if coalesce(p_is_published,false)
     and p_secondary_target_type <> 'none'
     and not v_has_secondary_label then
    raise exception 'published secondary hero target requires a button label';
  end if;

  select coalesce(max(sort_order),-1)+1 into v_sort from public.cms_hero_slides;

  insert into public.cms_hero_slides(
    title,title_en,title_ar,subtitle,subtitle_en,subtitle_ar,eyebrow_en,eyebrow_ar,
    image_url,mobile_image_url,image_alt_en,image_alt_ar,mobile_image_alt_en,mobile_image_alt_ar,
    button_label,button_label_en,button_label_ar,target_type,target_value,
    secondary_button_label_en,secondary_button_label_ar,secondary_target_type,secondary_target_value,
    sort_order,is_published,starts_at,ends_at,content_alignment,overlay_opacity,
    button_style,secondary_button_style,content_theme,open_in_new_tab,secondary_open_in_new_tab
  ) values (
    nullif(btrim(coalesce(p_title_en,'')),''),
    nullif(btrim(coalesce(p_title_en,'')),''),
    nullif(btrim(coalesce(p_title_ar,'')),''),
    nullif(btrim(coalesce(p_subtitle_en,'')),''),
    nullif(btrim(coalesce(p_subtitle_en,'')),''),
    nullif(btrim(coalesce(p_subtitle_ar,'')),''),
    nullif(btrim(coalesce(p_eyebrow_en,'')),''),
    nullif(btrim(coalesce(p_eyebrow_ar,'')),''),
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
    nullif(btrim(coalesce(p_secondary_button_label_en,'')),''),
    nullif(btrim(coalesce(p_secondary_button_label_ar,'')),''),
    p_secondary_target_type,
    case when p_secondary_target_type='none' then null else nullif(btrim(coalesce(p_secondary_target_value,'')),'') end,
    v_sort,coalesce(p_is_published,false),p_starts_at,p_ends_at,p_content_alignment,p_overlay_opacity,
    p_button_style,p_secondary_button_style,p_content_theme,
    coalesce(p_open_in_new_tab,false),coalesce(p_secondary_open_in_new_tab,false)
  )
  returning * into v_slide;

  perform private.log_cms_action(
    'create','hero_slide',v_slide.id::text,
    jsonb_build_object(
      'published',v_slide.is_published,
      'sort_order',v_slide.sort_order,
      'content_theme',v_slide.content_theme,
      'has_secondary_cta',v_slide.secondary_target_type <> 'none'
    )
  );

  return v_slide;
end;
$$;

create or replace function public.update_cms_hero_slide_v2(
  p_slide_id uuid,
  p_title_en text default null,
  p_title_ar text default null,
  p_subtitle_en text default null,
  p_subtitle_ar text default null,
  p_eyebrow_en text default null,
  p_eyebrow_ar text default null,
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
  p_secondary_button_label_en text default null,
  p_secondary_button_label_ar text default null,
  p_secondary_target_type text default 'none',
  p_secondary_target_value text default null,
  p_is_published boolean default false,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_content_alignment text default 'start',
  p_overlay_opacity integer default 20,
  p_button_style text default 'primary',
  p_secondary_button_style text default 'secondary',
  p_content_theme text default 'light',
  p_open_in_new_tab boolean default false,
  p_secondary_open_in_new_tab boolean default false
)
returns public.cms_hero_slides
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_slide public.cms_hero_slides%rowtype;
  v_has_secondary_label boolean :=
    nullif(btrim(coalesce(p_secondary_button_label_en,'')),'') is not null
    or nullif(btrim(coalesce(p_secondary_button_label_ar,'')),'') is not null;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  if p_target_type not in ('url','product','collection','none') then raise exception 'invalid target type'; end if;
  if p_secondary_target_type not in ('url','product','collection','none') then raise exception 'invalid secondary target type'; end if;
  if p_content_alignment not in ('start','center','end') then raise exception 'invalid content alignment'; end if;
  if p_button_style not in ('primary','secondary','light','dark') then raise exception 'invalid button style'; end if;
  if p_secondary_button_style not in ('primary','secondary','light','dark') then raise exception 'invalid secondary button style'; end if;
  if p_content_theme not in ('light','dark','glass') then raise exception 'invalid content theme'; end if;
  if p_overlay_opacity < 0 or p_overlay_opacity > 90 then raise exception 'overlay opacity must be between 0 and 90'; end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then raise exception 'hero end time must be after start time'; end if;
  if coalesce(p_is_published,false) and nullif(btrim(coalesce(p_image_url,'')),'') is null then raise exception 'published hero requires desktop image'; end if;
  if nullif(btrim(coalesce(p_image_url,'')),'') is not null and p_image_url !~* '^https://' then raise exception 'hero desktop image must use HTTPS'; end if;
  if nullif(btrim(coalesce(p_mobile_image_url,'')),'') is not null and p_mobile_image_url !~* '^https://' then raise exception 'hero mobile image must use HTTPS'; end if;

  perform private.validate_cms_hero_target(p_target_type,p_target_value,p_is_published);

  if p_secondary_target_type <> 'none' then
    perform private.validate_cms_hero_target(p_secondary_target_type,p_secondary_target_value,p_is_published);
  elsif coalesce(p_is_published,false) and v_has_secondary_label then
    raise exception 'published secondary hero button requires a target';
  end if;

  if coalesce(p_is_published,false)
     and p_secondary_target_type <> 'none'
     and not v_has_secondary_label then
    raise exception 'published secondary hero target requires a button label';
  end if;

  update public.cms_hero_slides
  set
    title=nullif(btrim(coalesce(p_title_en,'')),''),
    title_en=nullif(btrim(coalesce(p_title_en,'')),''),
    title_ar=nullif(btrim(coalesce(p_title_ar,'')),''),
    subtitle=nullif(btrim(coalesce(p_subtitle_en,'')),''),
    subtitle_en=nullif(btrim(coalesce(p_subtitle_en,'')),''),
    subtitle_ar=nullif(btrim(coalesce(p_subtitle_ar,'')),''),
    eyebrow_en=nullif(btrim(coalesce(p_eyebrow_en,'')),''),
    eyebrow_ar=nullif(btrim(coalesce(p_eyebrow_ar,'')),''),
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
    secondary_button_label_en=nullif(btrim(coalesce(p_secondary_button_label_en,'')),''),
    secondary_button_label_ar=nullif(btrim(coalesce(p_secondary_button_label_ar,'')),''),
    secondary_target_type=p_secondary_target_type,
    secondary_target_value=case when p_secondary_target_type='none' then null else nullif(btrim(coalesce(p_secondary_target_value,'')),'') end,
    is_published=coalesce(p_is_published,false),
    starts_at=p_starts_at,
    ends_at=p_ends_at,
    content_alignment=p_content_alignment,
    overlay_opacity=p_overlay_opacity,
    button_style=p_button_style,
    secondary_button_style=p_secondary_button_style,
    content_theme=p_content_theme,
    open_in_new_tab=coalesce(p_open_in_new_tab,false),
    secondary_open_in_new_tab=coalesce(p_secondary_open_in_new_tab,false),
    updated_at=now()
  where id=p_slide_id
  returning * into v_slide;

  if v_slide.id is null then raise exception 'hero slide not found'; end if;

  perform private.log_cms_action(
    'update','hero_slide',v_slide.id::text,
    jsonb_build_object(
      'published',v_slide.is_published,
      'sort_order',v_slide.sort_order,
      'content_theme',v_slide.content_theme,
      'has_secondary_cta',v_slide.secondary_target_type <> 'none'
    )
  );

  return v_slide;
end;
$$;

revoke all on function public.create_cms_hero_slide_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  boolean,timestamptz,timestamptz,text,integer,text,text,text,boolean,boolean
) from public, anon;
grant execute on function public.create_cms_hero_slide_v2(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  boolean,timestamptz,timestamptz,text,integer,text,text,text,boolean,boolean
) to authenticated;

revoke all on function public.update_cms_hero_slide_v2(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  boolean,timestamptz,timestamptz,text,integer,text,text,text,boolean,boolean
) from public, anon;
grant execute on function public.update_cms_hero_slide_v2(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  boolean,timestamptz,timestamptz,text,integer,text,text,text,boolean,boolean
) to authenticated;
