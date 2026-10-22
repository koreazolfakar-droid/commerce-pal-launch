-- Staff reads must remain independent from the public active/published filters.
-- SELECT is also required for INSERT ... RETURNING and UPDATE under RLS.
-- Keep invoker RPCs and the existing verified staff/MFA predicate; do not grant
-- customer or anonymous access to unpublished catalog rows.
do $$
declare
  catalog_table text;
begin
  foreach catalog_table in array array[
    'store_products', 'store_product_variants', 'store_product_images',
    'store_categories', 'store_collections', 'store_collection_products'
  ] loop
    execute format('drop policy if exists %I on public.%I', catalog_table || '_staff_select', catalog_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_dashboard_staff()))',
      catalog_table || '_staff_select', catalog_table
    );
  end loop;
end;
$$;
