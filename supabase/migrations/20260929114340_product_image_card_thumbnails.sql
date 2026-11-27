alter table public.store_product_images
  add column if not exists thumbnail_url text;
