-- ═══════════════════════════════════════════════════════════════
-- 036: drop the player phone-uniqueness partial index
--
-- Phone is no longer an identity field for app accounts — the user-
-- chosen name is (members.username, idx_members_username_ci). And the
-- activation code is the only way an app account becomes linked to a
-- dashboard subscription.
--
-- Removing this index lets:
--   • Signup proceed even when the typed phone matches a dashboard
--     member (no more silent auto-link).
--   • Two app accounts share a phone if needed (family members on one
--     device, second account after a phone reset, etc.).
--
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS public.members_player_phone_normalized_unique;
