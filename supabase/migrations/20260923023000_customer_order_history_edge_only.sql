-- Customer order history is now served through the JWT-verified
-- customer-orders Edge Function. Remove the public SECURITY DEFINER RPCs so
-- signed-in users cannot invoke privileged order-history functions directly.

drop function if exists public.get_my_store_order_items(uuid);
drop function if exists public.get_my_store_orders(integer);
