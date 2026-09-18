-- Defense-in-depth for the Space Call admin dashboard.
-- Supabase Auth + user_roles remain the authorization source of truth.
-- Editors can read/create/update; permanent deletes require admin.

do $$
declare
  t text;
begin
  foreach t in array array[
    'cms_brands',
    'cms_hero_slides',
    'cms_media_assets',
    'cms_navigation_items',
    'cms_sections',
    'cms_seo_pages',
    'cms_site_settings',
    'store_categories',
    'store_collection_products',
    'store_collections',
    'store_customers',
    'store_inventory_movements',
    'store_order_items',
    'store_orders',
    'store_product_images',
    'store_product_variants',
    'store_products'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'dashboard_admin_delete_' || t, t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_dashboard_admin()))',
      'dashboard_admin_delete_' || t,
      t
    );
  end loop;
end $$;

-- Store data: replace broad ALL policies with explicit non-destructive editor permissions.
drop policy if exists store_categories_staff_write on public.store_categories;
drop policy if exists store_categories_staff_insert on public.store_categories;
drop policy if exists store_categories_staff_update on public.store_categories;
create policy store_categories_staff_insert on public.store_categories for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_categories_staff_update on public.store_categories for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_collection_products_staff_write on public.store_collection_products;
drop policy if exists store_collection_products_staff_insert on public.store_collection_products;
drop policy if exists store_collection_products_staff_update on public.store_collection_products;
create policy store_collection_products_staff_insert on public.store_collection_products for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_collection_products_staff_update on public.store_collection_products for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_collections_staff_write on public.store_collections;
drop policy if exists store_collections_staff_insert on public.store_collections;
drop policy if exists store_collections_staff_update on public.store_collections;
create policy store_collections_staff_insert on public.store_collections for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_collections_staff_update on public.store_collections for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_customers_staff_write on public.store_customers;
drop policy if exists store_customers_staff_insert on public.store_customers;
drop policy if exists store_customers_staff_update on public.store_customers;
create policy store_customers_staff_insert on public.store_customers for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_customers_staff_update on public.store_customers for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_inventory_staff_all on public.store_inventory_movements;
drop policy if exists store_inventory_staff_select on public.store_inventory_movements;
drop policy if exists store_inventory_staff_insert on public.store_inventory_movements;
drop policy if exists store_inventory_staff_update on public.store_inventory_movements;
create policy store_inventory_staff_select on public.store_inventory_movements for select to authenticated using ((select private.is_dashboard_staff()));
create policy store_inventory_staff_insert on public.store_inventory_movements for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_inventory_staff_update on public.store_inventory_movements for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_order_items_staff_all on public.store_order_items;
drop policy if exists store_order_items_staff_select on public.store_order_items;
drop policy if exists store_order_items_staff_insert on public.store_order_items;
drop policy if exists store_order_items_staff_update on public.store_order_items;
create policy store_order_items_staff_select on public.store_order_items for select to authenticated using ((select private.is_dashboard_staff()));
create policy store_order_items_staff_insert on public.store_order_items for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_order_items_staff_update on public.store_order_items for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_orders_staff_all on public.store_orders;
drop policy if exists store_orders_staff_select on public.store_orders;
drop policy if exists store_orders_staff_insert on public.store_orders;
drop policy if exists store_orders_staff_update on public.store_orders;
create policy store_orders_staff_select on public.store_orders for select to authenticated using ((select private.is_dashboard_staff()));
create policy store_orders_staff_insert on public.store_orders for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_orders_staff_update on public.store_orders for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_product_images_staff_write on public.store_product_images;
drop policy if exists store_product_images_staff_insert on public.store_product_images;
drop policy if exists store_product_images_staff_update on public.store_product_images;
create policy store_product_images_staff_insert on public.store_product_images for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_product_images_staff_update on public.store_product_images for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_product_variants_staff_write on public.store_product_variants;
drop policy if exists store_product_variants_staff_insert on public.store_product_variants;
drop policy if exists store_product_variants_staff_update on public.store_product_variants;
create policy store_product_variants_staff_insert on public.store_product_variants for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_product_variants_staff_update on public.store_product_variants for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists store_products_staff_write on public.store_products;
drop policy if exists store_products_staff_insert on public.store_products;
drop policy if exists store_products_staff_update on public.store_products;
create policy store_products_staff_insert on public.store_products for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy store_products_staff_update on public.store_products for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

-- CMS data: preserve editor read/create/update while admin alone can delete.
drop policy if exists dashboard_staff_brands on public.cms_brands;
drop policy if exists dashboard_staff_brands_select on public.cms_brands;
drop policy if exists dashboard_staff_brands_insert on public.cms_brands;
drop policy if exists dashboard_staff_brands_update on public.cms_brands;
create policy dashboard_staff_brands_select on public.cms_brands for select to authenticated using ((select private.is_dashboard_staff()));
create policy dashboard_staff_brands_insert on public.cms_brands for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy dashboard_staff_brands_update on public.cms_brands for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists dashboard_staff_hero on public.cms_hero_slides;
drop policy if exists dashboard_staff_hero_select on public.cms_hero_slides;
drop policy if exists dashboard_staff_hero_insert on public.cms_hero_slides;
drop policy if exists dashboard_staff_hero_update on public.cms_hero_slides;
create policy dashboard_staff_hero_select on public.cms_hero_slides for select to authenticated using ((select private.is_dashboard_staff()));
create policy dashboard_staff_hero_insert on public.cms_hero_slides for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy dashboard_staff_hero_update on public.cms_hero_slides for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists dashboard_staff_media_assets on public.cms_media_assets;
drop policy if exists dashboard_staff_media_assets_select on public.cms_media_assets;
drop policy if exists dashboard_staff_media_assets_insert on public.cms_media_assets;
drop policy if exists dashboard_staff_media_assets_update on public.cms_media_assets;
create policy dashboard_staff_media_assets_select on public.cms_media_assets for select to authenticated using ((select private.is_dashboard_staff()));
create policy dashboard_staff_media_assets_insert on public.cms_media_assets for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy dashboard_staff_media_assets_update on public.cms_media_assets for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists dashboard_staff_navigation on public.cms_navigation_items;
drop policy if exists dashboard_staff_navigation_select on public.cms_navigation_items;
drop policy if exists dashboard_staff_navigation_insert on public.cms_navigation_items;
drop policy if exists dashboard_staff_navigation_update on public.cms_navigation_items;
create policy dashboard_staff_navigation_select on public.cms_navigation_items for select to authenticated using ((select private.is_dashboard_staff()));
create policy dashboard_staff_navigation_insert on public.cms_navigation_items for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy dashboard_staff_navigation_update on public.cms_navigation_items for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists dashboard_staff_sections on public.cms_sections;
drop policy if exists dashboard_staff_sections_select on public.cms_sections;
drop policy if exists dashboard_staff_sections_insert on public.cms_sections;
drop policy if exists dashboard_staff_sections_update on public.cms_sections;
create policy dashboard_staff_sections_select on public.cms_sections for select to authenticated using ((select private.is_dashboard_staff()));
create policy dashboard_staff_sections_insert on public.cms_sections for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy dashboard_staff_sections_update on public.cms_sections for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists dashboard_staff_seo on public.cms_seo_pages;
drop policy if exists dashboard_staff_seo_select on public.cms_seo_pages;
drop policy if exists dashboard_staff_seo_insert on public.cms_seo_pages;
drop policy if exists dashboard_staff_seo_update on public.cms_seo_pages;
create policy dashboard_staff_seo_select on public.cms_seo_pages for select to authenticated using ((select private.is_dashboard_staff()));
create policy dashboard_staff_seo_insert on public.cms_seo_pages for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy dashboard_staff_seo_update on public.cms_seo_pages for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

drop policy if exists dashboard_staff_site_settings on public.cms_site_settings;
drop policy if exists dashboard_staff_site_settings_select on public.cms_site_settings;
drop policy if exists dashboard_staff_site_settings_insert on public.cms_site_settings;
drop policy if exists dashboard_staff_site_settings_update on public.cms_site_settings;
create policy dashboard_staff_site_settings_select on public.cms_site_settings for select to authenticated using ((select private.is_dashboard_staff()));
create policy dashboard_staff_site_settings_insert on public.cms_site_settings for insert to authenticated with check ((select private.is_dashboard_staff()));
create policy dashboard_staff_site_settings_update on public.cms_site_settings for update to authenticated using ((select private.is_dashboard_staff())) with check ((select private.is_dashboard_staff()));

-- Storage: editors can read/upload/update CMS media; only admins may permanently delete.
drop policy if exists dashboard_media_staff_delete on storage.objects;
drop policy if exists dashboard_media_admin_delete on storage.objects;
create policy dashboard_media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'cms-media' and (select private.is_dashboard_admin()));
