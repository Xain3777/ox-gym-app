-- 044_member_status_suspended.sql
--
-- The reception "suspend account" button (health page + members page) posts
-- members.status = 'suspended', but the member_status enum was created as
-- ('active', 'expiring', 'expired') and no migration ever extended it.
-- Every suspend attempt therefore failed at the DB layer with:
--   invalid input value for enum member_status: "suspended"
--
-- Run this statement on its own in the Supabase SQL Editor.
-- (ALTER TYPE ... ADD VALUE cannot run inside a transaction block.)

ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'suspended';
