ALTER TABLE email_candidatures
    ADD COLUMN IF NOT EXISTS message_id VARCHAR(255) UNIQUE;
