-- OX GYM - Migration 028: phone-only member identity
--
-- Phone is the only identity key for linking Web App profiles to
-- dashboard member rows. Names are display/context only: duplicate names
-- are allowed and must not block linking.

COMMENT ON COLUMN public.members.phone_normalized IS
  'Canonical digits-only phone identity key. Used for app-to-dashboard member linking; duplicate player phones are not allowed.';

COMMENT ON COLUMN public.members.name_normalized IS
  'Canonical normalized display name. Kept only for search/context; it is not an identity key and must not be used for app auto-linking.';

DROP INDEX IF EXISTS public.members_player_identity_match_idx;

CREATE UNIQUE INDEX IF NOT EXISTS members_player_phone_normalized_unique
  ON public.members (phone_normalized)
  WHERE role = 'player' AND phone_normalized IS NOT NULL;
