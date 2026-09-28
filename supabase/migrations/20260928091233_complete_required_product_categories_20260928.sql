-- Complete the required specification-aware category set without exposing
-- empty storefront categories. New categories start inactive and can be enabled
-- by staff when products are assigned.

insert into public.store_categories (
  name,
  slug,
  description,
  sort_order,
  is_active,
  is_featured,
  spec_template
)
select
  'Headphones',
  'headphones',
  'Over-ear and on-ear headphones.',
  coalesce((select max(sort_order) from public.store_categories), 0) + 10,
  false,
  false,
  jsonb_build_object(
    'sections',
    jsonb_build_array(
      jsonb_build_object(
        'title', 'Audio',
        'titleAr', 'الصوت',
        'fields', jsonb_build_array(
          jsonb_build_object('key','driver','label','Driver','labelAr','وحدة الصوت'),
          jsonb_build_object('key','noise_cancellation','label','Noise cancellation','labelAr','إلغاء الضوضاء'),
          jsonb_build_object('key','microphones','label','Microphones','labelAr','الميكروفونات')
        )
      ),
      jsonb_build_object(
        'title', 'Connectivity',
        'titleAr', 'الاتصال',
        'fields', jsonb_build_array(
          jsonb_build_object('key','bluetooth','label','Bluetooth','labelAr','بلوتوث','unit','Bluetooth'),
          jsonb_build_object('key','codecs','label','Codecs','labelAr','ترميزات الصوت'),
          jsonb_build_object('key','connection','label','Wired connection','labelAr','الاتصال السلكي'),
          jsonb_build_object('key','compatibility','label','Compatibility','labelAr','التوافق')
        )
      ),
      jsonb_build_object(
        'title', 'Power & Fit',
        'titleAr', 'الطاقة والملاءمة',
        'fields', jsonb_build_array(
          jsonb_build_object('key','battery_life','label','Battery life','labelAr','عمر البطارية'),
          jsonb_build_object('key','charging','label','Charging','labelAr','الشحن'),
          jsonb_build_object('key','weight','label','Weight','labelAr','الوزن'),
          jsonb_build_object('key','fit','label','Fit','labelAr','الملاءمة')
        )
      )
    )
  )
where not exists (
  select 1 from public.store_categories where slug = 'headphones'
);

insert into public.store_categories (
  name,
  slug,
  description,
  sort_order,
  is_active,
  is_featured,
  spec_template
)
select
  'Bags',
  'bags',
  'Device bags, sleeves and carrying cases.',
  coalesce((select max(sort_order) from public.store_categories), 0) + 10,
  false,
  false,
  jsonb_build_object(
    'sections',
    jsonb_build_array(
      jsonb_build_object(
        'title', 'Details',
        'titleAr', 'التفاصيل',
        'fields', jsonb_build_array(
          jsonb_build_object('key','bag_type','label','Bag type','labelAr','نوع الحقيبة'),
          jsonb_build_object('key','capacity','label','Capacity','labelAr','السعة'),
          jsonb_build_object('key','device_fit','label','Device fit','labelAr','مقاس الجهاز','unit','inches'),
          jsonb_build_object('key','material','label','Material','labelAr','المادة'),
          jsonb_build_object('key','dimensions','label','Dimensions','labelAr','الأبعاد'),
          jsonb_build_object('key','water_resistance','label','Water resistance','labelAr','مقاومة الماء')
        )
      )
    )
  )
where not exists (
  select 1 from public.store_categories where slug = 'bags'
);
