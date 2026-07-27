-- V1__init_schema.sql
-- GRH-VENTEC initial database schema

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── users ────────────────────────────────────────────────────────────────────
-- Mirrors Keycloak users; keycloak_id is the sub claim from JWT
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_id     VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    role            VARCHAR(50) NOT NULL,   -- RH | MANAGER | ADMIN
    department      VARCHAR(100),
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── job_postings ─────────────────────────────────────────────────────────────
CREATE TABLE job_postings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    department      VARCHAR(100),
    location        VARCHAR(100),
    contract_type   VARCHAR(50),            -- CDI | CDD | STAGE | FREELANCE
    description     TEXT,
    requirements    TEXT,
    min_experience  INTEGER,                -- years
    status          VARCHAR(50) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | PUBLISHED | CLOSED
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    deadline        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── candidates ───────────────────────────────────────────────────────────────
CREATE TABLE candidates (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255),
    phone               VARCHAR(30),
    linkedin_url        VARCHAR(500),
    cv_path             VARCHAR(500),        -- relative path on storage volume
    cv_extracted_text   TEXT,               -- raw text extracted from CV
    skills              JSONB,              -- ["Java","Spring Boot",...]
    experience_years    INTEGER,
    education           TEXT,
    current_position    VARCHAR(255),
    location            VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── filter_jobs ───────────────────────────────────────────────────────────────
-- Tracks async AI filtering requests
CREATE TABLE filter_jobs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id  UUID        NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- PENDING | RUNNING | DONE | FAILED
    requested_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    result          JSONB,                  -- [{candidate_id, score, summary}, ...]
    error_message   TEXT
);

-- ── applications ──────────────────────────────────────────────────────────────
CREATE TABLE applications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_posting_id  UUID        NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL DEFAULT 'NEW',
    -- NEW | SCREENING | INTERVIEW | OFFER | HIRED | REJECTED
    ai_score        NUMERIC(5,2),           -- 0.00 – 100.00
    ai_summary      TEXT,
    notes           TEXT,
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_application UNIQUE (candidate_id, job_posting_id)
);

-- ── interviews ────────────────────────────────────────────────────────────────
CREATE TABLE interviews (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_at        TIMESTAMPTZ NOT NULL,
    duration_minutes    INTEGER     NOT NULL DEFAULT 60,
    type                VARCHAR(50),         -- VIDEO | PHONE | ON_SITE
    location_or_link    VARCHAR(500),
    interviewer_ids     JSONB,               -- [uuid, uuid, ...]
    status              VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',  -- SCHEDULED | DONE | CANCELLED
    notes               TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── document_checklists ───────────────────────────────────────────────────────
CREATE TABLE document_checklists (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_posting_id  UUID        NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    documents       JSONB       NOT NULL DEFAULT '[]',
    -- [{name, required, received, path, received_at}]
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_checklist UNIQUE (candidate_id, job_posting_id)
);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(100) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    read            BOOLEAN     NOT NULL DEFAULT FALSE,
    reference_type  VARCHAR(100),           -- APPLICATION | INTERVIEW | FILTER_JOB
    reference_id    UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_job_postings_status        ON job_postings(status);
CREATE INDEX idx_job_postings_created_by    ON job_postings(created_by);

CREATE INDEX idx_candidates_email           ON candidates(email);

CREATE INDEX idx_filter_jobs_posting        ON filter_jobs(job_posting_id);
CREATE INDEX idx_filter_jobs_status         ON filter_jobs(status);

CREATE INDEX idx_applications_candidate     ON applications(candidate_id);
CREATE INDEX idx_applications_posting       ON applications(job_posting_id);
CREATE INDEX idx_applications_status        ON applications(status);

CREATE INDEX idx_interviews_application     ON interviews(application_id);
CREATE INDEX idx_interviews_scheduled_at    ON interviews(scheduled_at);

CREATE INDEX idx_doc_checklists_candidate   ON document_checklists(candidate_id);

CREATE INDEX idx_notifications_user_unread  ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at   ON notifications(created_at DESC);
