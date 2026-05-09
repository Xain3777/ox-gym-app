-- OX GYM - Migration 024: WE SWIM owner line + feminine manager wording

ALTER TABLE public.partner_cards
  ADD COLUMN IF NOT EXISTS owner_title TEXT,
  ADD COLUMN IF NOT EXISTS owner_name TEXT;

UPDATE public.partner_cards
SET
  owner_title = 'المالك',
  owner_name = 'كوتش أدهم زيدان',
  supervisor_name = 'هلا',
  updated_at = now()
WHERE slug = 'we-swim';
