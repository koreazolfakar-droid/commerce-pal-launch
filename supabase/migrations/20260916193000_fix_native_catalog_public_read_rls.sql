-- Keep public native-catalog reads independent from dashboard-only helpers.
-- Staff access remains provided by the existing authenticated ALL policies.

DROP POLICY IF EXISTS store_products_public_read ON public.store_products;
CREATE POLICY store_products_public_read
ON public.store_products
FOR SELECT
TO anon, authenticated
USING (
  status = 'active'
  AND (published_at IS NULL OR published_at <= now())
);

DROP POLICY IF EXISTS store_product_variants_public_read ON public.store_product_variants;
CREATE POLICY store_product_variants_public_read
ON public.store_product_variants
FOR SELECT
TO anon, authenticated
USING (
  is_active
  AND EXISTS (
    SELECT 1
    FROM public.store_products p
    WHERE p.id = store_product_variants.product_id
      AND p.status = 'active'
      AND (p.published_at IS NULL OR p.published_at <= now())
  )
);

DROP POLICY IF EXISTS store_product_images_public_read ON public.store_product_images;
CREATE POLICY store_product_images_public_read
ON public.store_product_images
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_products p
    WHERE p.id = store_product_images.product_id
      AND p.status = 'active'
      AND (p.published_at IS NULL OR p.published_at <= now())
  )
);

DROP POLICY IF EXISTS store_categories_public_read ON public.store_categories;
CREATE POLICY store_categories_public_read
ON public.store_categories
FOR SELECT
TO anon, authenticated
USING (is_active);

DROP POLICY IF EXISTS store_collections_public_read ON public.store_collections;
CREATE POLICY store_collections_public_read
ON public.store_collections
FOR SELECT
TO anon, authenticated
USING (is_active);

DROP POLICY IF EXISTS store_collection_products_public_read ON public.store_collection_products;
CREATE POLICY store_collection_products_public_read
ON public.store_collection_products
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_collections c
    WHERE c.id = store_collection_products.collection_id
      AND c.is_active
  )
  AND EXISTS (
    SELECT 1
    FROM public.store_products p
    WHERE p.id = store_collection_products.product_id
      AND p.status = 'active'
      AND (p.published_at IS NULL OR p.published_at <= now())
  )
);
