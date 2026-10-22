-- Empty development databases still need the canonical taxonomy expected by
-- the historical category consolidation migration. No production rows or IDs.
insert into public.store_categories(name, slug)
values ('Smartphone', 'smartphone'), ('Tablet', 'tablet'), ('Charger', 'charger'), ('Cable', 'cable')
on conflict (slug) do nothing;
