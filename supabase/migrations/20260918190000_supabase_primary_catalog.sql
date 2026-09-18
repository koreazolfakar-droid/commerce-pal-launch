-- Align the native catalog schema with the real Shopify data that was migrated.
-- Shopify permits duplicate SKUs, so keep SKU indexed but not unique.
drop index if exists public.store_product_variants_sku_unique;
create index if not exists store_product_variants_sku_idx
  on public.store_product_variants(sku)
  where sku is not null and btrim(sku) <> '';

-- Brand identity is public storefront content. Writes stay protected by the
-- existing authenticated dashboard staff policy.
grant select on table public.cms_brands to anon;
drop policy if exists deny_direct_public_cms_brands on public.cms_brands;
drop policy if exists cms_brands_public_read on public.cms_brands;
create policy cms_brands_public_read
  on public.cms_brands
  for select
  to anon, authenticated
  using (is_visible);
