-- Retain one authenticated read predicate where production already has the
-- combined public/staff policy. Fresh databases without that policy keep the
-- explicit staff read installed by the preceding migration.
do $$
declare
  catalog_table text;
begin
  foreach catalog_table in array array[
    'store_categories', 'store_collections', 'store_collection_products'
  ] loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = catalog_table
        and policyname = catalog_table || '_authenticated_read'
        and cmd = 'SELECT' and 'authenticated'::name = any(roles)
        and qual like '%private.is_dashboard_staff()%'
    ) then
      execute format('drop policy if exists %I on public.%I', catalog_table || '_staff_select', catalog_table);
    end if;
  end loop;
end;
$$;

-- Anonymous reads never evaluate the private staff helper. Authenticated
-- readers use one policy combining the same published filter and staff check.
drop policy if exists store_product_images_public_read on public.store_product_images;
create policy store_product_images_public_read
on public.store_product_images for select to anon
using (exists (
  select 1 from public.store_products p
  where p.id = store_product_images.product_id and p.status = 'active'
    and (p.published_at is null or p.published_at <= now())
));

drop policy if exists store_product_images_authenticated_read on public.store_product_images;
create policy store_product_images_authenticated_read
on public.store_product_images for select to authenticated
using ((select private.is_dashboard_staff()) or exists (
  select 1 from public.store_products p
  where p.id = store_product_images.product_id and p.status = 'active'
    and (p.published_at is null or p.published_at <= now())
));
drop policy if exists store_product_images_staff_select on public.store_product_images;
