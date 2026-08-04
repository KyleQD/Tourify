-- Migration: Add soft-delete support to staff_shifts
-- This allows shifts to be marked as deleted without losing historical data.

ALTER TABLE staff_shifts
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for efficient filtering of non-deleted rows
CREATE INDEX IF NOT EXISTS idx_staff_shifts_deleted_at ON staff_shifts(deleted_at) WHERE deleted_at IS NULL;

-- Optional: partial index for queries that need to find deleted rows
CREATE INDEX IF NOT EXISTS idx_staff_shifts_deleted_at_not_null ON staff_shifts(deleted_at) WHERE deleted_at IS NOT NULL;
