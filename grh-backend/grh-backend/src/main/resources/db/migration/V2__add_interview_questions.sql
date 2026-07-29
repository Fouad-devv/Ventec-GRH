-- V2__add_interview_questions.sql
-- Add AI-generated interview questions to interviews table

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS questions JSONB;
