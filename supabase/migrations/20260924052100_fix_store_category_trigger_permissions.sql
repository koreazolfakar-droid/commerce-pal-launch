-- Fix category updates failing with:
--   permission denied for function canonical_store_category_slug
--
-- The duplicate-category trigger intentionally keeps both helper functions private
-- from anon/authenticated users. The trigger function, however, was SECURITY
-- INVOKER by default, so an authenticated dashboard update inherited the caller's
-- lack of EXECUTE permission when it called the private canonicalizer.
--
-- Run the trigger as its owner instead. The function already uses an empty
-- search_path and fully-qualified object names, so this keeps the helper private
-- without granting direct EXECUTE access to storefront/dashboard roles.

alter function private.prevent_duplicate_store_category_family()
  security definer;

revoke all on function private.canonical_store_category_slug(text)
  from public, anon, authenticated;

revoke all on function private.prevent_duplicate_store_category_family()
  from public, anon, authenticated;

comment on function private.prevent_duplicate_store_category_family() is
  'Prevents duplicate canonical category families. SECURITY DEFINER is required so the trigger can call the private slug canonicalizer without exposing either helper to anon/authenticated roles.';
