-- Harden the immutable phone normalizer against caller-controlled search_path.
-- The function only needs built-in pg_catalog functions.
alter function private.normalize_customer_phone(text)
  set search_path = pg_catalog;
