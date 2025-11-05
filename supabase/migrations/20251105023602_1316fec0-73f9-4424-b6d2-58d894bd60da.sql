-- Add attachment_url column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Add comment
COMMENT ON COLUMN assignments.attachment_url IS 'URL or path to assignment attachment file (PDF)';