-- OX GYM - Migration 022: partner cards + WE SWIM contact/logo fields

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-assets',
  'partner-assets',
  TRUE,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.partner_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  eyebrow          TEXT,
  subtitle         TEXT,
  bullets          TEXT[] NOT NULL DEFAULT '{}',
  logo_url         TEXT,
  supervisor_name  TEXT,
  supervisor_phone TEXT,
  contact_phone    TEXT,
  cta_label        TEXT,
  cta_url          TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_partner_cards_updated_at ON public.partner_cards;
CREATE TRIGGER trg_partner_cards_updated_at
  BEFORE UPDATE ON public.partner_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.partner_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_cards_select_active ON public.partner_cards;
CREATE POLICY partner_cards_select_active ON public.partner_cards
FOR SELECT TO authenticated
USING (is_active);

DROP POLICY IF EXISTS partner_cards_staff_write ON public.partner_cards;
CREATE POLICY partner_cards_staff_write ON public.partner_cards
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','admin','head_coach'))
WITH CHECK (public.current_user_role() IN ('manager','admin','head_coach'));

INSERT INTO public.partner_cards (
  slug,
  title,
  eyebrow,
  subtitle,
  bullets,
  logo_url,
  supervisor_name,
  supervisor_phone,
  contact_phone,
  cta_label,
  cta_url,
  sort_order
)
VALUES (
  'we-swim',
  'WE SWIM',
  'مدرسة السباحة',
  'مدرسة السباحة — بإدارة كوتش أدهم زيدان',
  ARRAY[
    'تدريس السباحة لجميع الأعمار',
    'تدريب احترافي ومتقدم',
    'علاج الإصابات داخل الماء (Hydrotherapy)'
  ],
  NULL,
  'كوتش أدهم زيدان',
  NULL,
  NULL,
  'زيارة صفحة WE SWIM',
  'https://www.instagram.com/weswim',
  10
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  eyebrow = EXCLUDED.eyebrow,
  subtitle = EXCLUDED.subtitle,
  bullets = EXCLUDED.bullets,
  supervisor_name = COALESCE(public.partner_cards.supervisor_name, EXCLUDED.supervisor_name),
  cta_label = EXCLUDED.cta_label,
  cta_url = EXCLUDED.cta_url,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
