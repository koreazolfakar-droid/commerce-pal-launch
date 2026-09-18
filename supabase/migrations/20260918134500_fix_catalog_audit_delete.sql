-- Fix catalog audit deletes so audit history never blocks deleting a product or variant.
-- Deleted entity identifiers remain preserved in before_data; live foreign-key columns are
-- intentionally NULL on DELETE because the referenced row no longer exists after the trigger fires.

create or replace function private.store_capture_catalog_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
  v_variant_id uuid;
  v_entity_type text;
begin
  if tg_table_name = 'store_products' then
    v_entity_type := 'product';

    if tg_op = 'DELETE' then
      -- AFTER DELETE: the product row is no longer a valid FK target.
      v_product_id := null;
    else
      v_product_id := new.id;
    end if;

    v_variant_id := null;
  else
    v_entity_type := 'variant';

    if tg_op = 'DELETE' then
      -- AFTER DELETE: avoid stale FKs during direct or cascaded variant deletion.
      -- old.id and old.product_id remain available inside before_data.
      v_product_id := null;
      v_variant_id := null;
    else
      v_product_id := new.product_id;
      v_variant_id := new.id;
    end if;
  end if;

  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then
    return new;
  end if;

  insert into public.store_catalog_audit_log (
    product_id,
    variant_id,
    entity_type,
    action,
    before_data,
    after_data,
    changed_by
  ) values (
    v_product_id,
    v_variant_id,
    v_entity_type,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    auth.uid()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;
