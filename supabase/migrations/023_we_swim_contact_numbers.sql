-- OX GYM - Migration 023: WE SWIM manager and center phone lines

ALTER TABLE public.partner_cards
  ADD COLUMN IF NOT EXISTS center_phone TEXT,
  ADD COLUMN IF NOT EXISTS center_phone_2 TEXT;

UPDATE public.partner_cards
SET
  supervisor_name = 'هلا',
  supervisor_phone = '0930688165',
  center_phone = '0937727442',
  center_phone_2 = '0968593100',
  updated_at = now()
WHERE slug = 'we-swim';
