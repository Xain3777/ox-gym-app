-- 009: Drop email column; phone is the new identity.
-- Add username (case-insensitive unique), visible temp_password,
-- and the physical-profile columns the onboarding wizard writes.
DROP INDEX IF EXISTS public.idx_members_email;
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_email_key;
ALTER TABLE public.members DROP COLUMN IF EXISTS email;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_username_ci
  ON public.members (LOWER(username)) WHERE username IS NOT NULL;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS temp_password TEXT;

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1);
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS fitness_goal TEXT;

ALTER TABLE public.members ALTER COLUMN role SET DEFAULT 'player';
