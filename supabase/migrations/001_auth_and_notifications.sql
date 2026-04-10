-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 001: Auth columns + Notifications table
-- Run this in Supabase SQL Editor if you already have the base schema.
-- ═══════════════════════════════════════════════════════════════

-- New enums
CREATE TYPE user_role            AS ENUM ('admin', 'client');
CREATE TYPE notification_type    AS ENUM ('announcement', 'reminder', 'promotion', 'alert');
CREATE TYPE notification_status  AS ENUM ('sent', 'failed', 'pending');

-- Add auth columns to members
ALTER TABLE members
  ADD COLUMN auth_id UUID UNIQUE,
  ADD COLUMN role    user_role NOT NULL DEFAULT 'client';

CREATE INDEX idx_members_auth_id ON members(auth_id);

-- Notifications table
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id) ON DELETE SET NULL,
  type        notification_type NOT NULL DEFAULT 'announcement',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  audience    TEXT NOT NULL DEFAULT 'all',
  status      notification_status NOT NULL DEFAULT 'sent',
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT NOT NULL
);

CREATE INDEX idx_notifications_sent_at   ON notifications(sent_at);
CREATE INDEX idx_notifications_member_id ON notifications(member_id);
