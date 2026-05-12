-- ═══════════════════════════════════════════════════════════════
-- 033: backfill members.username from members.full_name
--
-- One-time backfill so every existing player account has a username
-- and can sign in by name (not only by phone). Done after
-- 032_member_app_profiles_active_and_code lands and after the signup
-- flow was simplified to use the name as the login identifier.
--
-- Idempotent — only touches rows where username IS NULL. Uniqueness
-- was pre-checked against the case-insensitive partial unique index
-- idx_members_username_ci: zero conflicts at migration time.
-- ═══════════════════════════════════════════════════════════════

UPDATE public.members AS m
SET username = TRIM(m.full_name)
WHERE m.role = 'player'
  AND m.auth_id IS NOT NULL
  AND m.username IS NULL
  AND m.full_name IS NOT NULL
  AND LENGTH(TRIM(m.full_name)) BETWEEN 2 AND 50;
