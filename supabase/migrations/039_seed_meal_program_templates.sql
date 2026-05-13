-- OX GYM - Migration 039: seed default meal program templates (OX BULK + OX SHRED)

-- ── OX BULK / قسم الضخامة الذكية ──────────────────────────────
WITH bulk_template AS (
  INSERT INTO public.meal_program_templates (key, name, category, description, is_active)
  VALUES (
    'ox_bulk',
    'OX BULK',
    'bulk',
    'قسم الضخامة الذكية — خطة وجبات لزيادة الكتلة العضلية بذكاء.',
    TRUE
  )
  ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING id
),
bulk_day AS (
  INSERT INTO public.meal_template_days (template_id, day_number, name, day_type, sort_order)
  SELECT id, 1, 'يوم نموذجي', 'training', 0 FROM bulk_template
  RETURNING id, template_id
)
INSERT INTO public.meal_template_meals (template_id, day_id, meal_slot, name, description, example, sort_order)
SELECT bulk_day.template_id, bulk_day.id, slot, name, description, example, sort_order
FROM bulk_day
CROSS JOIN (
  VALUES
    ('breakfast',    'الفطور',                'ركّز على كربوهيدرات عالية + الألياف + بروتين.',                              'شوفان بالحليب والموز + بيض مسلوق',         0),
    ('post_workout', 'وجبة ما بعد التمرين',   'يجب أن تحتوي على أسرع أنواع الكربوهيدرات لتعويض المخازن.',                  'أرز أبيض + صدور دجاج',                    1),
    ('dinner',       'العشاء',                'وجبة متوازنة السعرات لتجنب تراكم الدهون الزائدة قبل النوم.',                'بطاطا حلوة + سمك أو لحم بقر قليل الدسم',   2)
) AS m(slot, name, description, example, sort_order);

-- ── OX SHRED / قسم التنشيف الدقيق ─────────────────────────────
WITH shred_template AS (
  INSERT INTO public.meal_program_templates (key, name, category, description, is_active)
  VALUES (
    'ox_shred',
    'OX SHRED',
    'cut',
    'قسم التنشيف الدقيق — خطة وجبات لتنشيف الجسم وتقليل الدهون مع الحفاظ على العضلة.',
    TRUE
  )
  ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING id
),
shred_day AS (
  INSERT INTO public.meal_template_days (template_id, day_number, name, day_type, sort_order)
  SELECT id, 1, 'يوم نموذجي', 'training', 0 FROM shred_template
  RETURNING id, template_id
)
INSERT INTO public.meal_template_meals (template_id, day_id, meal_slot, name, description, example, sort_order)
SELECT shred_day.template_id, shred_day.id, slot, name, description, example, sort_order
FROM shred_day
CROSS JOIN (
  VALUES
    ('breakfast',    'الفطور',                'بروتين عالي وألياف لزيادة الشبع.',                                          'أومليت خضار + قطعة خبز أسمر صغيرة',      0),
    ('post_workout', 'وجبة ما بعد التمرين',   'كربوهيدرات محسوبة بدقة وبروتين عالي.',                                      'كمية قليلة من الأرز + صدور دجاج مشوية',  1),
    ('dinner',       'العشاء',                'بروتين بطيء الامتصاص وقليل الكربوهيدرات.',                                  'علبة تونا أو جبنة قريش + سلطة خضراء كبيرة', 2)
) AS m(slot, name, description, example, sort_order);
