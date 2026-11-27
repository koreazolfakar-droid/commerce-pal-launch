-- Temporary direct public hero read path used during LCP diagnosis.
-- Kept in migration history for reproducibility; the following migration restores gateway-only reads.

revoke select on table public.cms_hero_slides from anon;

grant select (
  id,
  title,
  title_en,
  title_ar,
  subtitle,
  subtitle_en,
  subtitle_ar,
  eyebrow_en,
  eyebrow_ar,
  image_url,
  mobile_image_url,
  image_alt_en,
  image_alt_ar,
  mobile_image_alt_en,
  mobile_image_alt_ar,
  button_label,
  button_label_en,
  button_label_ar,
  target_type,
  target_value,
  secondary_button_label_en,
  secondary_button_label_ar,
  secondary_target_type,
  secondary_target_value,
  sort_order,
  content_alignment,
  overlay_opacity,
  button_style,
  secondary_button_style,
  content_theme,
  open_in_new_tab,
  secondary_open_in_new_tab,
  visual_config,
  is_published,
  starts_at,
  ends_at
) on table public.cms_hero_slides to anon;

drop policy if exists deny_direct_public_cms_hero on public.cms_hero_slides;
drop policy if exists public_read_active_cms_hero on public.cms_hero_slides;

create policy public_read_active_cms_hero
on public.cms_hero_slides
for select
to anon
using (
  is_published = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

notify pgrst, 'reload schema';
