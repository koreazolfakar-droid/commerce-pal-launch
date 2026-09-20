-- Preserve exact uploaded image masters while keeping optimized storefront derivatives.
-- Dashboard source-image validation already caps uploads at 20 MB.
update storage.buckets
set file_size_limit = 20 * 1024 * 1024
where id = 'cms-media'
  and (file_size_limit is null or file_size_limit < 20 * 1024 * 1024);
