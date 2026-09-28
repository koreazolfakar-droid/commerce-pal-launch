-- Backfill Arabic labels for the existing category specification templates.
-- Existing custom Arabic labels are preserved. Unknown labels safely fall back
-- to their English text so older/future templates remain renderable.

create or replace function private.spacecall_spec_section_ar(p_title text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case btrim(coalesce(p_title, ''))
    when 'Display' then 'الشاشة'
    when 'Performance' then 'الأداء'
    when 'Cameras' then 'الكاميرات'
    when 'Power & Connectivity' then 'الطاقة والاتصال'
    when 'Hardware' then 'العتاد'
    when 'Other' then 'أخرى'
    when 'Display & Build' then 'الشاشة والتصميم'
    when 'Features' then 'الميزات'
    when 'Audio' then 'الصوت'
    when 'Connectivity' then 'الاتصال'
    when 'Power & Fit' then 'الطاقة والملاءمة'
    when 'Power' then 'الطاقة'
    when 'Compatibility' then 'التوافق'
    when 'Connections' then 'التوصيلات'
    when 'Battery' then 'البطارية'
    when 'Design' then 'التصميم'
    when 'System' then 'النظام'
    when 'Details' then 'التفاصيل'
    when 'Game' then 'اللعبة'
    when 'Media' then 'الوسائط'
    else coalesce(nullif(btrim(p_title), ''), 'المواصفات')
  end;
$$;

create or replace function private.spacecall_spec_field_ar(p_key text, p_label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(btrim(coalesce(p_key, '')))
    when 'screen' then 'حجم الشاشة'
    when 'resolution' then 'الدقة'
    when 'refresh_rate' then 'معدل التحديث'
    when 'chipset' then 'المعالج'
    when 'ram' then 'الذاكرة العشوائية'
    when 'storage' then 'سعة التخزين'
    when 'rear_camera' then 'الكاميرا الخلفية'
    when 'front_camera' then 'الكاميرا الأمامية'
    when 'battery' then 'البطارية'
    when 'charging' then 'الشحن'
    when 'network' then 'الشبكة'
    when 'bluetooth' then 'بلوتوث'
    when 'connectivity' then 'الاتصال'
    when 'stylus' then 'دعم القلم'
    when 'processor' then 'المعالج'
    when 'graphics' then 'الرسوميات'
    when 'ports' then 'المنافذ'
    when 'weight' then 'الوزن'
    when 'os' then 'نظام التشغيل'
    when 'case_size' then 'حجم الهيكل'
    when 'water_resistance' then 'مقاومة الماء'
    when 'sensors' then 'المستشعرات'
    when 'compatibility' then 'التوافق'
    when 'battery_life' then 'عمر البطارية'
    when 'driver' then 'وحدة الصوت'
    when 'noise_cancellation' then 'إلغاء الضوضاء'
    when 'microphones' then 'الميكروفونات'
    when 'codecs' then 'ترميزات الصوت'
    when 'fit' then 'الملاءمة'
    when 'output' then 'القدرة القصوى'
    when 'input' then 'الإدخال'
    when 'protocols' then 'بروتوكولات الشحن'
    when 'plug' then 'نوع القابس'
    when 'connector_a' then 'الموصل A'
    when 'connector_b' then 'الموصل B'
    when 'length' then 'الطول'
    when 'power' then 'القدرة القصوى'
    when 'data_rate' then 'معدل نقل البيانات'
    when 'material' then 'المادة'
    when 'capacity' then 'السعة'
    when 'display' then 'الشاشة'
    when 'platform' then 'المنصة'
    when 'frame_rate' then 'معدل الإطارات'
    when 'controller' then 'وحدة التحكم'
    when 'disc_drive' then 'قارئ الأقراص'
    when 'device_fit' then 'مقاس الجهاز'
    when 'dimensions' then 'الأبعاد'
    when 'pockets' then 'الجيوب'
    when 'genre' then 'النوع'
    when 'edition' then 'الإصدار'
    when 'players' then 'عدد اللاعبين'
    when 'format' then 'الصيغة'
    when 'region' then 'المنطقة'
    when 'languages' then 'اللغات'
    when 'age_rating' then 'التصنيف العمري'
    when 'accessory_type' then 'نوع الإكسسوار'
    when 'connection' then 'الاتصال'
    else coalesce(nullif(btrim(p_label), ''), p_key)
  end;
$$;

update public.store_categories as category
set spec_template = jsonb_build_object(
  'sections',
  coalesce(
    (
      select jsonb_agg(
        section.value
        || jsonb_build_object(
          'titleAr',
          coalesce(
            nullif(btrim(section.value ->> 'titleAr'), ''),
            private.spacecall_spec_section_ar(section.value ->> 'title')
          ),
          'fields',
          coalesce(
            (
              select jsonb_agg(
                field.value
                || jsonb_build_object(
                  'labelAr',
                  coalesce(
                    nullif(btrim(field.value ->> 'labelAr'), ''),
                    private.spacecall_spec_field_ar(
                      field.value ->> 'key',
                      field.value ->> 'label'
                    )
                  )
                )
                order by field.ordinality
              )
              from jsonb_array_elements(
                coalesce(section.value -> 'fields', '[]'::jsonb)
              ) with ordinality as field(value, ordinality)
            ),
            '[]'::jsonb
          )
        )
        order by section.ordinality
      )
      from jsonb_array_elements(
        coalesce(category.spec_template -> 'sections', '[]'::jsonb)
      ) with ordinality as section(value, ordinality)
    ),
    '[]'::jsonb
  )
)
where jsonb_typeof(category.spec_template) = 'object'
  and jsonb_typeof(category.spec_template -> 'sections') = 'array';

drop function private.spacecall_spec_field_ar(text,text);
drop function private.spacecall_spec_section_ar(text);
