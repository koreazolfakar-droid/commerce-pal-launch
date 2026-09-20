CREATE OR REPLACE FUNCTION private.normalize_customer_phone(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = ''
AS $function$
  select regexp_replace(coalesce(value, ''), '[^0-9]+', '', 'g')
$function$;