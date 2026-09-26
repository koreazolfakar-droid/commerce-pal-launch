-- Category-aware structured product specifications.
-- Additive and legacy-safe: unsupported specification JSON is retained under "legacy".
alter table public.store_categories
  add column if not exists spec_template jsonb not null default '{"sections":[]}'::jsonb;

update public.store_products
set specifications = case
  when specifications is null or specifications = '{}'::jsonb
    then '{"values":{},"keySpecs":[]}'::jsonb
  else jsonb_build_object(
    'values', '{}'::jsonb,
    'keySpecs', '[]'::jsonb,
    'legacy', specifications
  )
end
where specifications is null
   or specifications = '{}'::jsonb
   or jsonb_typeof(specifications) <> 'object'
   or jsonb_typeof(specifications->'values') is distinct from 'object'
   or jsonb_typeof(specifications->'keySpecs') is distinct from 'array';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_categories_spec_template_shape'
      and conrelid = 'public.store_categories'::regclass
  ) then
    alter table public.store_categories
      add constraint store_categories_spec_template_shape
      check (
        jsonb_typeof(spec_template) = 'object'
        and jsonb_typeof(spec_template->'sections') = 'array'
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_products_specs_shape'
      and conrelid = 'public.store_products'::regclass
  ) then
    alter table public.store_products
      add constraint store_products_specs_shape
      check (
        jsonb_typeof(specifications) = 'object'
        and jsonb_typeof(specifications->'values') = 'object'
        and jsonb_typeof(specifications->'keySpecs') = 'array'
      ) not valid;
  end if;
end
$$;

alter table public.store_categories
  validate constraint store_categories_spec_template_shape;
alter table public.store_products
  validate constraint store_products_specs_shape;

update public.store_categories set spec_template = '{"sections":[{"title":"Display","fields":[{"key":"screen","label":"Screen size","unit":"inches"},{"key":"resolution","label":"Resolution"},{"key":"refresh_rate","label":"Refresh rate","unit":"Hz"}]},{"title":"Performance","fields":[{"key":"chipset","label":"Chipset"},{"key":"ram","label":"RAM","unit":"GB"},{"key":"storage","label":"Storage","unit":"GB"}]},{"title":"Cameras","fields":[{"key":"rear_camera","label":"Rear camera"},{"key":"front_camera","label":"Front camera"}]},{"title":"Power & Connectivity","fields":[{"key":"battery","label":"Battery","unit":"mAh"},{"key":"charging","label":"Charging","unit":"W"},{"key":"network","label":"Network"},{"key":"bluetooth","label":"Bluetooth","unit":"Bluetooth"}]}]}'::jsonb where slug = 'smartphone' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Display","fields":[{"key":"screen","label":"Screen size","unit":"inches"},{"key":"resolution","label":"Resolution"},{"key":"refresh_rate","label":"Refresh rate","unit":"Hz"}]},{"title":"Performance","fields":[{"key":"chipset","label":"Chipset"},{"key":"ram","label":"RAM","unit":"GB"},{"key":"storage","label":"Storage","unit":"GB"}]},{"title":"Power & Connectivity","fields":[{"key":"battery","label":"Battery","unit":"mAh"},{"key":"charging","label":"Charging","unit":"W"},{"key":"connectivity","label":"Connectivity"},{"key":"stylus","label":"Stylus support"}]}]}'::jsonb where slug = 'tablet' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Display","fields":[{"key":"screen","label":"Screen size","unit":"inches"},{"key":"resolution","label":"Resolution"},{"key":"refresh_rate","label":"Refresh rate","unit":"Hz"}]},{"title":"Hardware","fields":[{"key":"processor","label":"Processor"},{"key":"ram","label":"RAM","unit":"GB"},{"key":"storage","label":"Storage","unit":"GB"},{"key":"graphics","label":"Graphics"}]},{"title":"Other","fields":[{"key":"battery","label":"Battery"},{"key":"ports","label":"Ports"},{"key":"weight","label":"Weight"},{"key":"os","label":"Operating system"}]}]}'::jsonb where slug = 'laptops' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Audio","fields":[{"key":"driver","label":"Driver"},{"key":"noise_cancellation","label":"Noise cancellation"},{"key":"microphones","label":"Microphones"}]},{"title":"Connectivity","fields":[{"key":"bluetooth","label":"Bluetooth","unit":"Bluetooth"},{"key":"codecs","label":"Codecs"},{"key":"compatibility","label":"Compatibility"}]},{"title":"Power & Fit","fields":[{"key":"battery_life","label":"Battery life"},{"key":"charging","label":"Charging"},{"key":"water_resistance","label":"Water resistance"},{"key":"fit","label":"Fit"}]}]}'::jsonb where slug = 'wireless-earbuds' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Audio","fields":[{"key":"driver","label":"Driver"},{"key":"noise_cancellation","label":"Noise cancellation"},{"key":"microphones","label":"Microphones"},{"key":"frequency_response","label":"Frequency response"}]},{"title":"Connectivity & Controls","fields":[{"key":"connection","label":"Connection"},{"key":"bluetooth","label":"Bluetooth","unit":"Bluetooth"},{"key":"codecs","label":"Codecs"},{"key":"controls","label":"Controls"}]},{"title":"Power & Comfort","fields":[{"key":"battery_life","label":"Battery life"},{"key":"charging","label":"Charging"},{"key":"weight","label":"Weight"},{"key":"fit","label":"Fit"}]}]}'::jsonb where slug in ('headphones','headphone','over-ear-headphones') and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Power","fields":[{"key":"output","label":"Maximum output","unit":"W"},{"key":"ports","label":"Ports"},{"key":"input","label":"Input"}]},{"title":"Compatibility","fields":[{"key":"protocols","label":"Charging protocols"},{"key":"compatibility","label":"Compatibility"},{"key":"plug","label":"Plug type"}]}]}'::jsonb where slug = 'charger' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Connections","fields":[{"key":"connector_a","label":"Connector A"},{"key":"connector_b","label":"Connector B"},{"key":"length","label":"Length"}]},{"title":"Performance","fields":[{"key":"power","label":"Maximum power","unit":"W"},{"key":"data_rate","label":"Data rate"},{"key":"compatibility","label":"Compatibility"},{"key":"material","label":"Material"}]}]}'::jsonb where slug = 'cable' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Battery","fields":[{"key":"capacity","label":"Capacity","unit":"mAh"},{"key":"output","label":"Maximum output","unit":"W"},{"key":"input","label":"Input"},{"key":"ports","label":"Ports"}]},{"title":"Design","fields":[{"key":"display","label":"Display"},{"key":"weight","label":"Weight"},{"key":"compatibility","label":"Compatibility"}]}]}'::jsonb where slug = 'power-bank' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Game","fields":[{"key":"platform","label":"Platform"},{"key":"genre","label":"Genre"},{"key":"edition","label":"Edition"},{"key":"players","label":"Players"}]},{"title":"Media","fields":[{"key":"format","label":"Format"},{"key":"region","label":"Region"},{"key":"languages","label":"Languages"},{"key":"age_rating","label":"Age rating"}]}]}'::jsonb where slug = 'playstation-games' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"System","fields":[{"key":"platform","label":"Platform"},{"key":"storage","label":"Storage","unit":"GB"},{"key":"resolution","label":"Output resolution"},{"key":"frame_rate","label":"Frame rate","unit":"Hz"}]},{"title":"Connectivity","fields":[{"key":"controller","label":"Controller"},{"key":"ports","label":"Ports"},{"key":"network","label":"Network"},{"key":"disc_drive","label":"Disc drive"}]}]}'::jsonb where slug = 'gaming-console' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Details","fields":[{"key":"accessory_type","label":"Accessory type"},{"key":"compatibility","label":"Compatibility"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"connection","label":"Connection"}]}]}'::jsonb where slug = 'accessories' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Details","fields":[{"key":"capacity","label":"Capacity"},{"key":"device_fit","label":"Laptop fit","unit":"inches"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"pockets","label":"Pockets"},{"key":"water_resistance","label":"Water resistance"}]}]}'::jsonb where slug = 'backpack' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Display & Build","fields":[{"key":"screen","label":"Screen size","unit":"inches"},{"key":"case_size","label":"Case size"},{"key":"water_resistance","label":"Water resistance"}]},{"title":"Features","fields":[{"key":"sensors","label":"Sensors"},{"key":"connectivity","label":"Connectivity"},{"key":"compatibility","label":"Compatibility"},{"key":"battery_life","label":"Battery life"}]}]}'::jsonb where slug = 'smart-watch' and spec_template = '{"sections":[]}'::jsonb;
update public.store_categories set spec_template = '{"sections":[{"title":"Display","fields":[{"key":"screen","label":"Screen size","unit":"inches"},{"key":"resolution","label":"Resolution"},{"key":"refresh_rate","label":"Refresh rate","unit":"Hz"}]},{"title":"Performance","fields":[{"key":"chipset","label":"Chipset"},{"key":"ram","label":"RAM","unit":"GB"},{"key":"storage","label":"Storage","unit":"GB"}]},{"title":"Cameras","fields":[{"key":"rear_camera","label":"Rear camera"},{"key":"front_camera","label":"Front camera"}]},{"title":"Power & Connectivity","fields":[{"key":"battery","label":"Battery","unit":"mAh"},{"key":"charging","label":"Charging","unit":"W"},{"key":"network","label":"Network"},{"key":"bluetooth","label":"Bluetooth","unit":"Bluetooth"}]}]}'::jsonb where slug = 'used-phone' and spec_template = '{"sections":[]}'::jsonb;

create or replace function private.validate_store_product_specifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  template jsonb;
  field jsonb;
  spec_key text;
  spec_value text;
  unit_name text;
  valid_keys text[] := array[]::text[];
begin
  if coalesce(new.specifications->'values', '{}'::jsonb) = '{}'::jsonb
    and coalesce(new.specifications->'keySpecs', '[]'::jsonb) = '[]'::jsonb then
    return new;
  end if;

  if new.category_id is null then
    raise exception 'A category is required for specifications';
  end if;

  select c.spec_template
  into template
  from public.store_categories c
  where c.id = new.category_id
  for share;

  if template is null then
    raise exception 'Specification template is unavailable';
  end if;

  if jsonb_typeof(new.specifications->'values') <> 'object'
    or jsonb_typeof(new.specifications->'keySpecs') <> 'array' then
    raise exception 'Invalid specification document';
  end if;

  for field in
    select f
    from jsonb_array_elements(template->'sections') section,
      lateral jsonb_array_elements(section->'fields') f
  loop
    valid_keys := array_append(valid_keys, field->>'key');
  end loop;

  for spec_key, spec_value in
    select key, value
    from jsonb_each_text(new.specifications->'values')
  loop
    if not spec_key = any(valid_keys)
      or length(trim(spec_value)) < 1
      or length(spec_value) > 240 then
      raise exception 'Invalid specification field: %', spec_key;
    end if;

    select f->>'unit'
    into unit_name
    from jsonb_array_elements(template->'sections') section,
      lateral jsonb_array_elements(section->'fields') f
    where f->>'key' = spec_key
    limit 1;

    if unit_name in ('GB', 'TB', 'mAh', 'W', 'Hz', 'inches')
      and spec_value !~* (
        '^[0-9]+(\.[0-9]+)?[[:space:]]*(' ||
        case unit_name
          when 'inches' then 'inches|inch|in|″|"'
          else unit_name
        end ||
        ')$'
      ) then
      raise exception 'Invalid unit for %', spec_key;
    end if;

    if unit_name = 'Bluetooth'
      and spec_value !~* '^(Bluetooth[[:space:]]*)?[0-9]+\.[0-9]+$' then
      raise exception 'Invalid Bluetooth version';
    end if;
  end loop;

  if jsonb_array_length(new.specifications->'keySpecs') > 6 then
    raise exception 'Too many key specifications';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(new.specifications->'keySpecs') key_spec
    where not (new.specifications->'values' ? key_spec)
      or not key_spec = any(valid_keys)
  ) then
    raise exception 'Invalid key specification';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_store_product_specifications on public.store_products;
create trigger validate_store_product_specifications
before insert or update of specifications, category_id on public.store_products
for each row execute function private.validate_store_product_specifications();

create or replace function private.guard_store_category_spec_template()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.spec_template = old.spec_template then
    return new;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.spec_template->'sections') section
    where jsonb_typeof(section) <> 'object'
      or jsonb_typeof(section->'fields') <> 'array'
  ) then
    raise exception 'Invalid specification template section';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.spec_template->'sections') section,
      lateral jsonb_array_elements(section->'fields') field
    where coalesce(field->>'key', '') !~ '^[a-z][a-z0-9_]{0,39}$'
      or length(trim(coalesce(field->>'label', ''))) < 1
  ) then
    raise exception 'Invalid specification template field';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(new.spec_template->'sections') section,
      lateral jsonb_array_elements(section->'fields') field
  ) <> (
    select count(distinct field->>'key')
    from jsonb_array_elements(new.spec_template->'sections') section,
      lateral jsonb_array_elements(section->'fields') field
  ) then
    raise exception 'Specification template keys must be unique';
  end if;

  if exists (
    select 1
    from public.store_products product,
      lateral jsonb_object_keys(
        coalesce(product.specifications->'values', '{}'::jsonb)
      ) used_key
    where product.category_id = new.id
      and not exists (
        select 1
        from jsonb_array_elements(new.spec_template->'sections') section,
          lateral jsonb_array_elements(section->'fields') field
        where field->>'key' = used_key
      )
  ) then
    raise exception 'A template field is used by products in this category. Keep its key or migrate those products first.';
  end if;

  if exists (
    select 1
    from public.store_products product,
      lateral jsonb_object_keys(
        coalesce(product.specifications->'values', '{}'::jsonb)
      ) used_key
    where product.category_id = new.id
      and coalesce((
        select field->>'unit'
        from jsonb_array_elements(old.spec_template->'sections') section,
          lateral jsonb_array_elements(section->'fields') field
        where field->>'key' = used_key
        limit 1
      ), '') is distinct from coalesce((
        select field->>'unit'
        from jsonb_array_elements(new.spec_template->'sections') section,
          lateral jsonb_array_elements(section->'fields') field
        where field->>'key' = used_key
        limit 1
      ), '')
  ) then
    raise exception 'A template unit is used by products in this category. Migrate those product values before changing the unit.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_store_category_spec_template on public.store_categories;
create trigger guard_store_category_spec_template
before update of spec_template on public.store_categories
for each row execute function private.guard_store_category_spec_template();

create or replace function public.update_store_category_with_spec_template(
  p_category_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_image_url text,
  p_icon text,
  p_sort_order integer,
  p_is_active boolean,
  p_is_featured boolean,
  p_seo_title text,
  p_seo_description text,
  p_spec_template jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.store_categories
  set name = p_name,
      slug = p_slug,
      description = nullif(p_description, ''),
      image_url = nullif(p_image_url, ''),
      icon = nullif(p_icon, ''),
      sort_order = p_sort_order,
      is_active = p_is_active,
      is_featured = p_is_featured,
      seo_title = nullif(p_seo_title, ''),
      seo_description = nullif(p_seo_description, ''),
      spec_template = p_spec_template,
      updated_at = now()
  where id = p_category_id;

  update public.store_products
  set product_type = p_name,
      updated_at = now()
  where category_id = p_category_id;
end;
$$;

grant execute on function public.update_store_category_with_spec_template(
  uuid,
  text,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  boolean,
  text,
  text,
  jsonb
) to authenticated;
