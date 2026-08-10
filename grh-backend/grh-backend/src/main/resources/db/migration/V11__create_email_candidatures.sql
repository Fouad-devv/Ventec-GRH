-- V11__create_email_candidatures.sql
-- Tracks every inbound candidature email processed by the IMAP listener.
-- Stores both successful matches and failures (no match, no PDF, duplicate)
-- so that HR can review what the system received and acted on.

CREATE TABLE email_candidatures (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_email          VARCHAR(255) NOT NULL,
    sender_name           VARCHAR(255),
    subject               TEXT        NOT NULL,
    status                VARCHAR(30)  NOT NULL,     -- MATCHED | DUPLICATE | NO_MATCH | NO_PDF
    confidence            DECIMAL(4,2),              -- AI match confidence [0-1], null for NO_PDF
    matched_posting_id    UUID        REFERENCES job_postings(id) ON DELETE SET NULL,
    matched_posting_title VARCHAR(255),
    candidate_id          UUID        REFERENCES candidates(id) ON DELETE SET NULL,
    candidate_name        VARCHAR(255),
    received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_candidatures_received_at ON email_candidatures (received_at DESC);
CREATE INDEX idx_email_candidatures_status      ON email_candidatures (status);
