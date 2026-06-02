set client_min_messages = warning;

ALTER TABLE job_posting_templates
ADD COLUMN IF NOT EXISTS allow_applicant_messages boolean NOT NULL DEFAULT false;
