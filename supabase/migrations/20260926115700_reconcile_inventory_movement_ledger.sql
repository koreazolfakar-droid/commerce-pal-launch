-- Reconcile legacy inventory movement history to the current tracked stock.
--
-- Older dashboard paths could update variant stock directly without inserting
-- store_inventory_movements. The variant stock is the live storefront source of
-- truth, so this migration preserves it and records only the missing historical
-- adjustment needed to make the ledger auditable from this point forward.
--
-- The statement is naturally idempotent: after the inserted adjustment, the
-- movement sum equals stock_quantity and a rerun inserts nothing.

lock table public.store_product_variants in share row exclusive mode;
lock table public.store_inventory_movements in share row exclusive mode;

with movement_totals as (
  select
    movement.variant_id,
    coalesce(pg_catalog.sum(movement.quantity_delta), 0)::integer as movement_stock
  from public.store_inventory_movements as movement
  where movement.variant_id is not null
  group by movement.variant_id
),
reconciliation as (
  select
    variant.product_id,
    variant.id as variant_id,
    variant.stock_quantity - coalesce(movement.movement_stock, 0) as quantity_delta
  from public.store_product_variants as variant
  left join movement_totals as movement
    on movement.variant_id = variant.id
  where variant.track_inventory = true
    and variant.stock_quantity <> coalesce(movement.movement_stock, 0)
)
insert into public.store_inventory_movements (
  product_id,
  variant_id,
  movement_type,
  quantity_delta,
  reference_type,
  reference_id,
  note
)
select
  reconciliation.product_id,
  reconciliation.variant_id,
  'adjustment',
  reconciliation.quantity_delta,
  'inventory_reconciliation',
  '2026-09-26-ledger-reconciliation',
  'Legacy dashboard stock reconciliation: preserves current stock and records the missing movement balance.'
from reconciliation
where reconciliation.quantity_delta <> 0;
