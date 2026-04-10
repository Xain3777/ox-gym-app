-- ═══════════════════════════════════════════════════════════════
-- Migration 003: Expand user_role enum to 4 roles
-- Old: admin, client
-- New: player, coach, reception, manager
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Add new values to the enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'player';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coach';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'reception';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';

-- Step 2: Migrate existing data
-- admin → manager, client → player
UPDATE members SET role = 'manager' WHERE role = 'admin';
UPDATE members SET role = 'player' WHERE role = 'client';

-- Step 3: Update default
ALTER TABLE members ALTER COLUMN role SET DEFAULT 'player';

-- Step 4: Update RLS policies to include coach and reception
-- Coach can read their assigned players (for now, all players)
DROP POLICY IF EXISTS "Admins can read all members" ON members;
CREATE POLICY "Manager and coach can read all members"
  ON members FOR SELECT
  USING (
    auth.uid() = auth_id
    OR EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.role IN ('manager', 'coach', 'reception')
    )
  );

-- Manager can insert/update/delete members
DROP POLICY IF EXISTS "Admins can insert members" ON members;
CREATE POLICY "Manager and reception can insert members"
  ON members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.role IN ('manager', 'reception')
    )
  );

DROP POLICY IF EXISTS "Admins can update any member" ON members;
CREATE POLICY "Manager and reception can update members"
  ON members FOR UPDATE
  USING (
    auth.uid() = auth_id
    OR EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.role IN ('manager', 'reception')
    )
  );

DROP POLICY IF EXISTS "Admins can delete members" ON members;
CREATE POLICY "Manager can delete members"
  ON members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.role = 'manager'
    )
  );

-- Update plan management policies for coach
DROP POLICY IF EXISTS "Admins manage workout plans" ON workout_plans;
CREATE POLICY "Manager and coach manage workout plans"
  ON workout_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.role IN ('manager', 'coach')
    )
  );

DROP POLICY IF EXISTS "Admins manage meal plans" ON meal_plans;
CREATE POLICY "Manager and coach manage meal plans"
  ON meal_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.role IN ('manager', 'coach')
    )
  );

-- Update subscription policies for reception
DROP POLICY IF EXISTS "Admins full access subscriptions" ON subscriptions;
CREATE POLICY "Manager and reception manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
      AND m.role IN ('manager', 'reception')
    )
    OR (
      EXISTS (
        SELECT 1 FROM members m
        WHERE m.auth_id = auth.uid()
        AND m.id = subscriptions.member_id
      )
    )
  );
