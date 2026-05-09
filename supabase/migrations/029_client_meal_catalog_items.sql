-- OX GYM - Migration 029: client-visible meal catalog
--
-- Client meal and add-on prices live in Supabase so portal pages do not
-- depend only on hardcoded UI constants.

CREATE TABLE IF NOT EXISTS public.catalog_items (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL CHECK (kind IN ('meal', 'addon')),
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  description_ar  TEXT,
  unit_label_ar   TEXT,
  rice_grams      INTEGER,
  chicken_grams   INTEGER,
  includes_salad  BOOLEAN NOT NULL DEFAULT FALSE,
  price_syp       INTEGER NOT NULL CHECK (price_syp >= 0),
  calories        INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_catalog_items_updated_at ON public.catalog_items;
CREATE TRIGGER trg_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_items_select_active ON public.catalog_items;
CREATE POLICY catalog_items_select_active ON public.catalog_items
FOR SELECT TO authenticated
USING (is_active OR public.current_user_role() IN ('manager','head_coach','coach','admin','reception'));

DROP POLICY IF EXISTS catalog_items_staff_write ON public.catalog_items;
CREATE POLICY catalog_items_staff_write ON public.catalog_items
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','admin','reception'))
WITH CHECK (public.current_user_role() IN ('manager','admin','reception'));

INSERT INTO public.catalog_items (
  id, kind, name_ar, name_en, description_ar, unit_label_ar,
  rice_grams, chicken_grams, includes_salad, price_syp, calories, sort_order
)
VALUES
  ('meal_250_150', 'meal', 'وجبة رز ودجاج', 'Chicken and rice meal', '٢٥٠غ رز + ١٥٠غ دجاج + سلطة', 'وجبة', 250, 150, TRUE, 38000, NULL, 10),
  ('meal_300_200', 'meal', 'وجبة رز ودجاج', 'Chicken and rice meal', '٣٠٠غ رز + ٢٠٠غ دجاج + سلطة', 'وجبة', 300, 200, TRUE, 42000, NULL, 20),
  ('extra_rice_200g', 'addon', 'إضافة ٢٠٠غ رز', 'Extra 200g rice', 'أرز إضافي مع وجبة الجيم', '٢٠٠غ', 200, NULL, FALSE, 2000, NULL, 110),
  ('extra_chicken_200g', 'addon', 'إضافة ٢٠٠غ دجاج', 'Extra 200g chicken', 'صدر دجاج إضافي مع وجبة الجيم', '٢٠٠غ', NULL, 200, FALSE, 15000, NULL, 120)
ON CONFLICT (id) DO UPDATE SET
  kind = EXCLUDED.kind,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  unit_label_ar = EXCLUDED.unit_label_ar,
  rice_grams = EXCLUDED.rice_grams,
  chicken_grams = EXCLUDED.chicken_grams,
  includes_salad = EXCLUDED.includes_salad,
  price_syp = EXCLUDED.price_syp,
  calories = EXCLUDED.calories,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = now();
