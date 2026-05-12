-- ═══════════════════════════════════════════════════════════════
-- 037: re-enforce phone uniqueness — only for app accounts
--
-- Migration 036 dropped phone uniqueness entirely. The intent there
-- was to remove phone as an *identity* field (username is identity
-- now) and to stop signup from silently auto-linking by phone.
--
-- But we still want each app account to have a unique phone — that's
-- contact correctness, not identity. So re-create the partial unique
-- index, scoped so that dashboard-only stub members (auth_id IS NULL)
-- do NOT reserve a phone. The owner of that subscription can sign up
-- with the same phone without conflict; only TWO app accounts sharing
-- a phone is blocked.
-- ═══════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS public.members_player_phone_normalized_unique;

CREATE UNIQUE INDEX members_player_phone_normalized_unique
  ON public.members (phone_normalized)
  WHERE role = 'player'
    AND auth_id IS NOT NULL
    AND phone_normalized IS NOT NULL;
