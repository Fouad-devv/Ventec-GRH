-- V9__create_notifications.sql
-- In-app notifications for RH/Manager users

CREATE TABLE IF NOT EXISTS notifications (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type           VARCHAR(100) NOT NULL,
    title          VARCHAR(255) NOT NULL,
    body           TEXT,
    read           BOOLEAN      NOT NULL DEFAULT FALSE,
    reference_type VARCHAR(100),
    reference_id   UUID,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
