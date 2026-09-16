-- Preserve a durable history of local catalog changes made from the Space Call dashboard.
-- This migration is additive only: no existing product, variant, Shopify, order or CMS data is modified.

create table if not exists public.store_catalog_audit_log (
  id bigint generated always as identity primary key,
  product_id uuid references public.store_products(id) on delete set null,
  variant_id uuid references public.store_product_variants(id) on delete set null,
  entity_type text not null check (entity_type in ('product', 'variant')),
  action text not null check (action in ('insert', 'update', 'delete')),
  before_data jsonb,
  after_data jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists store_catalog_audit_product_idx
  on public.store_catalog_audit_log(product_id, created_at desc);
create index if not exists store_catalog_audit_variant_idx
  on public.store_catalog_audit_log(variant_id, created_at desc);
create index if not exists store_catalog_audit_created_idx
  on public.store_catalog_audit_log(created_at desc);

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
      v_product_id := old.id;
    else
      v_product_id := new.id;
    end if;
    v_variant_id := null;
  else
    v_entity_type := 'variant';
    if tg_op = 'DELETE' then
      v_product_id := old.product_id;
      v_variant_id := old.id;
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

drop trigger if exists store_products_catalog_audit on public.store_products;
create trigger store_products_catalog_audit
after insert or update or delete on public.store_products
for each row execute function private.store_capture_catalog_audit();

drop trigger if exists store_product_variants_catalog_audit on public.store_product_variants;
create trigger store_product_variants_catalog_audit
after insert or update or delete on public.store_product_variants
for each row execute function private.store_capture_catalog_audit();

alter table public.store_catalog_audit_log enable row level security;

revoke all on public.store_catalog_audit_log from public, anon, authenticated;
grant select on public.store_catalog_audit_log to authenticated;

drop policy if exists store_catalog_audit_staff_read on public.store_catalog_audit_log;
create policy store_catalog_audit_staff_read
on public.store_catalog_audit_log
for select
to authenticated
using ((select private.is_dashboard_staff()));

comment on table public.store_catalog_audit_log is
  'Immutable audit history for native Space Call catalog product and variant changes.';
