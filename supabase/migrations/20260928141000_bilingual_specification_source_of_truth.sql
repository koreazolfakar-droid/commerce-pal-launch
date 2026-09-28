-- Keep product specification localization and required category coverage reproducible
-- from source control. This migration is intentionally idempotent and preserves
-- any merchant-customized templates already present in production.

insert into public.store_categories (
  name,
  name_ar,
  slug,
  sort_order,
  is_active,
  is_featured,
  spec_template
)
select
  'Headphones',
  'سماعات رأس',
  'headphones',
  23,
  false,
  false,
  '{
    "sections": [
      {
        "title": "Audio",
        "titleAr": "الصوت",
        "fields": [
          {"key":"driver","label":"Driver","labelAr":"وحدة الصوت"},
          {"key":"noise_cancellation","label":"Noise cancellation","labelAr":"إلغاء الضوضاء"},
          {"key":"microphones","label":"Microphones","labelAr":"الميكروفونات"}
        ]
      },
      {
        "title": "Connectivity",
        "titleAr": "الاتصال",
        "fields": [
          {"key":"bluetooth","unit":"Bluetooth","label":"Bluetooth","labelAr":"بلوتوث"},
          {"key":"codecs","label":"Codecs","labelAr":"ترميزات الصوت"},
          {"key":"connection","label":"Wired connection","labelAr":"الاتصال السلكي"},
          {"key":"compatibility","label":"Compatibility","labelAr":"التوافق"}
        ]
      },
      {
        "title": "Power & Fit",
        "titleAr": "الطاقة والملاءمة",
        "fields": [
          {"key":"battery_life","label":"Battery life","labelAr":"عمر البطارية"},
          {"key":"charging","label":"Charging","labelAr":"الشحن"},
          {"key":"weight","label":"Weight","labelAr":"الوزن"},
          {"key":"fit","label":"Fit","labelAr":"الملاءمة"}
        ]
      }
    ]
  }'::jsonb
where not exists (
  select 1 from public.store_categories where slug = 'headphones'
);

insert into public.store_categories (
  name,
  name_ar,
  slug,
  sort_order,
  is_active,
  is_featured,
  spec_template
)
select
  'Bags',
  'حقائب',
  'bags',
  33,
  false,
  false,
  '{
    "sections": [
      {
        "title": "Details",
        "titleAr": "التفاصيل",
        "fields": [
          {"key":"bag_type","label":"Bag type","labelAr":"نوع الحقيبة"},
          {"key":"capacity","label":"Capacity","labelAr":"السعة"},
          {"key":"device_fit","unit":"inches","label":"Device fit","labelAr":"مقاس الجهاز"},
          {"key":"material","label":"Material","labelAr":"المادة"},
          {"key":"dimensions","label":"Dimensions","labelAr":"الأبعاد"},
          {"key":"water_resistance","label":"Water resistance","labelAr":"مقاومة الماء"}
        ]
      }
    ]
  }'::jsonb
where not exists (
  select 1 from public.store_categories where slug = 'bags'
);

update public.store_categories
set name_ar = coalesce(
  name_ar,
  case slug
    when 'smartphone' then 'هواتف ذكية'
    when 'tablet' then 'أجهزة لوحية'
    when 'laptops' then 'حواسيب محمولة'
    when 'smart-watch' then 'ساعات ذكية'
    when 'used-phone' then 'هواتف مستعملة'
    when 'wireless-earbuds' then 'سماعات أذن لاسلكية'
    when 'charger' then 'شواحن'
    when 'cable' then 'كابلات'
    when 'power-bank' then 'بطاريات محمولة'
    when 'gaming-console' then 'أجهزة ألعاب'
    when 'backpack' then 'حقائب ظهر'
    when 'playstation-games' then 'ألعاب بلايستيشن'
    when 'accessories' then 'إكسسوارات'
    when 'headphones' then 'سماعات رأس'
    when 'bags' then 'حقائب'
    else null
  end
)
where name_ar is null;

with
section_translations(en, ar) as (
  values
    ('Audio','الصوت'),
    ('Battery','البطارية'),
    ('Cameras','الكاميرات'),
    ('Compatibility','التوافق'),
    ('Connections','التوصيلات'),
    ('Connectivity','الاتصال'),
    ('Design','التصميم'),
    ('Details','التفاصيل'),
    ('Display','الشاشة'),
    ('Display & Build','الشاشة والتصميم'),
    ('Features','الميزات'),
    ('Game','اللعبة'),
    ('Hardware','العتاد'),
    ('Media','الوسائط'),
    ('Other','أخرى'),
    ('Performance','الأداء'),
    ('Power','الطاقة'),
    ('Power & Connectivity','الطاقة والاتصال'),
    ('Power & Fit','الطاقة والملاءمة'),
    ('System','النظام')
),
field_translations(en, ar) as (
  values
    ('Accessory type','نوع الإكسسوار'),
    ('Age rating','التصنيف العمري'),
    ('Bag type','نوع الحقيبة'),
    ('Battery','البطارية'),
    ('Battery life','عمر البطارية'),
    ('Bluetooth','بلوتوث'),
    ('Capacity','السعة'),
    ('Case size','حجم الهيكل'),
    ('Charging','الشحن'),
    ('Charging protocols','بروتوكولات الشحن'),
    ('Chipset','المعالج'),
    ('Codecs','ترميزات الصوت'),
    ('Compatibility','التوافق'),
    ('Connection','الاتصال'),
    ('Connectivity','الاتصال'),
    ('Connector A','الموصل A'),
    ('Connector B','الموصل B'),
    ('Controller','وحدة التحكم'),
    ('Data rate','معدل نقل البيانات'),
    ('Device fit','مقاس الجهاز'),
    ('Dimensions','الأبعاد'),
    ('Disc drive','قارئ الأقراص'),
    ('Display','الشاشة'),
    ('Driver','وحدة الصوت'),
    ('Edition','الإصدار'),
    ('Fit','الملاءمة'),
    ('Format','الصيغة'),
    ('Frame rate','معدل الإطارات'),
    ('Front camera','الكاميرا الأمامية'),
    ('Genre','النوع'),
    ('Graphics','الرسوميات'),
    ('Input','الإدخال'),
    ('Languages','اللغات'),
    ('Laptop fit','مقاس الجهاز'),
    ('Length','الطول'),
    ('Material','المادة'),
    ('Maximum output','القدرة القصوى'),
    ('Maximum power','القدرة القصوى'),
    ('Microphones','الميكروفونات'),
    ('Network','الشبكة'),
    ('Noise cancellation','إلغاء الضوضاء'),
    ('Operating system','نظام التشغيل'),
    ('Output resolution','الدقة'),
    ('Platform','المنصة'),
    ('Players','عدد اللاعبين'),
    ('Plug type','نوع القابس'),
    ('Pockets','الجيوب'),
    ('Ports','المنافذ'),
    ('Processor','المعالج'),
    ('RAM','الذاكرة العشوائية'),
    ('Rear camera','الكاميرا الخلفية'),
    ('Refresh rate','معدل التحديث'),
    ('Region','المنطقة'),
    ('Resolution','الدقة'),
    ('Screen size','حجم الشاشة'),
    ('Sensors','المستشعرات'),
    ('Storage','سعة التخزين'),
    ('Stylus support','دعم القلم'),
    ('Water resistance','مقاومة الماء'),
    ('Weight','الوزن'),
    ('Wired connection','الاتصال السلكي')
)
update public.store_categories as category
set
  spec_template = jsonb_set(
    category.spec_template,
    '{sections}',
    coalesce(
      (
        select jsonb_agg(
          (
            case
              when coalesce(nullif(section.value ->> 'titleAr', ''), section_translation.ar) is not null
                then section.value || jsonb_build_object(
                  'titleAr',
                  coalesce(nullif(section.value ->> 'titleAr', ''), section_translation.ar)
                )
              else section.value
            end
          )
          || jsonb_build_object(
            'fields',
            coalesce(
              (
                select jsonb_agg(
                  case
                    when coalesce(nullif(field.value ->> 'labelAr', ''), field_translation.ar) is not null
                      then field.value || jsonb_build_object(
                        'labelAr',
                        coalesce(nullif(field.value ->> 'labelAr', ''), field_translation.ar)
                      )
                    else field.value
                  end
                  order by field.ordinality
                )
                from jsonb_array_elements(coalesce(section.value -> 'fields', '[]'::jsonb))
                  with ordinality as field(value, ordinality)
                left join field_translations as field_translation
                  on field_translation.en = field.value ->> 'label'
              ),
              '[]'::jsonb
            )
          )
          order by section.ordinality
        )
        from jsonb_array_elements(coalesce(category.spec_template -> 'sections', '[]'::jsonb))
          with ordinality as section(value, ordinality)
        left join section_translations as section_translation
          on section_translation.en = section.value ->> 'title'
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = now()
where
  jsonb_typeof(category.spec_template) = 'object'
  and jsonb_typeof(category.spec_template -> 'sections') = 'array';
