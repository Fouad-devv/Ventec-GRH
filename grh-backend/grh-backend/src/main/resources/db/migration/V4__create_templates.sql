CREATE TABLE IF NOT EXISTS templates (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(50)  NOT NULL DEFAULT 'EMAIL',
    subject     VARCHAR(500),
    content     TEXT         NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
