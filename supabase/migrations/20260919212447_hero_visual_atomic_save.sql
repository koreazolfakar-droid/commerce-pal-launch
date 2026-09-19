create or replace function public.create_cms_hero_slide_v3(
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
  p_secondary_open_in_new_tab boolean default false,
  p_visual_config jsonb default '{"vertical":"bottom","titleSize":"standard","contentWidth":"standard","buttonRadius":"rounded"}'::jsonb
)
returns public.cms_hero_slides
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_slide public.cms_hero_slides%rowtype;
begin
  select public.create_cms_hero_slide_v2(
    p_title_en => p_title_en,
    p_title_ar => p_title_ar,
    p_subtitle_en => p_subtitle_en,
    p_subtitle_ar => p_subtitle_ar,
    p_eyebrow_en => p_eyebrow_en,
    p_eyebrow_ar => p_eyebrow_ar,
    p_image_url => p_image_url,
    p_mobile_image_url => p_mobile_image_url,
    p_image_alt_en => p_image_alt_en,
    p_image_alt_ar => p_image_alt_ar,
    p_mobile_image_alt_en => p_mobile_image_alt_en,
    p_mobile_image_alt_ar => p_mobile_image_alt_ar,
    p_button_label_en => p_button_label_en,
    p_button_label_ar => p_button_label_ar,
    p_target_type => p_target_type,
    p_target_value => p_target_value,
    p_secondary_button_label_en => p_secondary_button_label_en,
    p_secondary_button_label_ar => p_secondary_button_label_ar,
    p_secondary_target_type => p_secondary_target_type,
    p_secondary_target_value => p_secondary_target_value,
    p_is_published => p_is_published,
    p_starts_at => p_starts_at,
    p_ends_at => p_ends_at,
    p_content_alignment => p_content_alignment,
    p_overlay_opacity => p_overlay_opacity,
    p_button_style => p_button_style,
    p_secondary_button_style => p_secondary_button_style,
    p_content_theme => p_content_theme,
    p_open_in_new_tab => p_open_in_new_tab,
    p_secondary_open_in_new_tab => p_secondary_open_in_new_tab
  ) into v_slide;

  select public.set_cms_hero_visual_config(v_slide.id, p_visual_config) into v_slide;
  return v_slide;
end;
$$;

create or replace function public.update_cms_hero_slide_v3(
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
  p_secondary_open_in_new_tab boolean default false,
  p_visual_config jsonb default '{"vertical":"bottom","titleSize":"standard","contentWidth":"standard","buttonRadius":"rounded"}'::jsonb
)
returns public.cms_hero_slides
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_slide public.cms_hero_slides%rowtype;
begin
  select public.update_cms_hero_slide_v2(
    p_slide_id => p_slide_id,
    p_title_en => p_title_en,
    p_title_ar => p_title_ar,
    p_subtitle_en => p_subtitle_en,
    p_subtitle_ar => p_subtitle_ar,
    p_eyebrow_en => p_eyebrow_en,
    p_eyebrow_ar => p_eyebrow_ar,
    p_image_url => p_image_url,
    p_mobile_image_url => p_mobile_image_url,
    p_image_alt_en => p_image_alt_en,
    p_image_alt_ar => p_image_alt_ar,
    p_mobile_image_alt_en => p_mobile_image_alt_en,
    p_mobile_image_alt_ar => p_mobile_image_alt_ar,
    p_button_label_en => p_button_label_en,
    p_button_label_ar => p_button_label_ar,
    p_target_type => p_target_type,
    p_target_value => p_target_value,
    p_secondary_button_label_en => p_secondary_button_label_en,
    p_secondary_button_label_ar => p_secondary_button_label_ar,
    p_secondary_target_type => p_secondary_target_type,
    p_secondary_target_value => p_secondary_target_value,
    p_is_published => p_is_published,
    p_starts_at => p_starts_at,
    p_ends_at => p_ends_at,
    p_content_alignment => p_content_alignment,
    p_overlay_opacity => p_overlay_opacity,
    p_button_style => p_button_style,
    p_secondary_button_style => p_secondary_button_style,
    p_content_theme => p_content_theme,
    p_open_in_new_tab => p_open_in_new_tab,
    p_secondary_open_in_new_tab => p_secondary_open_in_new_tab
  ) into v_slide;

  select public.set_cms_hero_visual_config(v_slide.id, p_visual_config) into v_slide;
  return v_slide;
end;
$$;

revoke all on function public.create_cms_hero_slide_v3(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  boolean,timestamptz,timestamptz,text,integer,text,text,text,boolean,boolean,jsonb
) from public, anon;
grant execute on function public.create_cms_hero_slide_v3(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  boolean,timestamptz,timestamptz,text,integer,text,text,text,boolean,boolean,jsonb
) to authenticated;

revoke all on function public.update_cms_hero_slide_v3(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  boolean,timestamptz,timestamptz,text,integer,text,text,text,boolean,boolean,jsonb
) from public, anon;
grant execute on function public.update_cms_hero_slide_v3(
  uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  boolean,timestamptz,timestamptz,text,integer,text,text,text,boolean,boolean,jsonb
) to authenticated;