-- Preserve concurrent sales during metadata-only variant edits. Explicit stock
-- changes require the editor snapshot under the same row lock as the write.
create or replace function public.update_store_product_variant_guarded(
 p_variant_id uuid, p_title text, p_sku text, p_barcode text,
 p_price numeric, p_compare_at_price numeric, p_stock integer,
 p_track_inventory boolean, p_allow_backorder boolean, p_options jsonb,
 p_image_url text, p_sort_order integer, p_is_active boolean, p_expected_stock integer
) returns public.store_product_variants
language plpgsql security invoker set search_path = '' as $$
declare v_stock integer;
begin
 if auth.uid() is null or not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;
 select stock_quantity into v_stock from public.store_product_variants where id=p_variant_id for update;
 if not found then raise exception 'variant not found'; end if;
 if p_stock is not null and (p_expected_stock is null or v_stock is distinct from p_expected_stock) then
  raise exception 'Stock changed in another session. Refresh the variant before adjusting inventory.';
 end if;
 return public.update_store_product_variant(p_variant_id,p_title,p_sku,p_barcode,p_price,p_compare_at_price,
  coalesce(p_stock,v_stock),p_track_inventory,p_allow_backorder,p_options,p_image_url,p_sort_order,p_is_active);
end; $$;
revoke all on function public.update_store_product_variant_guarded(uuid,text,text,text,numeric,numeric,integer,boolean,boolean,jsonb,text,integer,boolean,integer) from public,anon;
grant execute on function public.update_store_product_variant_guarded(uuid,text,text,text,numeric,numeric,integer,boolean,boolean,jsonb,text,integer,boolean,integer) to authenticated;
