-- Keep storefront cart, secure checkout, and Dashboard delivery pricing aligned.
-- The Dashboard can change this value later; new orders always read the current
-- public setting server-side before totals are persisted.

insert into public.cms_site_settings (
  key,
  value_text,
  value_json,
  value_type,
  label,
  group_name,
  is_public,
  updated_at
)
values (
  'delivery_fee',
  '2.00',
  null,
  'number',
  'Default delivery fee',
  'commerce',
  true,
  pg_catalog.now()
)
on conflict (key) do update
set
  value_text = excluded.value_text,
  value_json = excluded.value_json,
  value_type = excluded.value_type,
  label = excluded.label,
  group_name = excluded.group_name,
  is_public = excluded.is_public,
  updated_at = excluded.updated_at;
