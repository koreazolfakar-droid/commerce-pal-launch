-- Restore the original gateway-only CMS security model.
-- Critical first-paint hero pixels now come from fixed public Storage aliases,
-- so direct anon access to cms_hero_slides is no longer required.

revoke select on table public.cms_hero_slides from anon;

drop policy if exists public_read_active_cms_hero on public.cms_hero_slides;
drop policy if exists deny_direct_public_cms_hero on public.cms_hero_slides;

create policy deny_direct_public_cms_hero
on public.cms_hero_slides
for select
to anon
using (false);

notify pgrst, 'reload schema';
