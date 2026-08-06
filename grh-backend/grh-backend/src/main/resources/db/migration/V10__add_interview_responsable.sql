ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS responsable_nom   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS responsable_email VARCHAR(255);
