-- Create certificates table to track generated certificates
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    module_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    module_title TEXT NOT NULL,
    completion_date TIMESTAMP WITH TIME ZONE NOT NULL,
    certificate_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one certificate per user per module
    UNIQUE(user_id, module_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_module ON certificates(module_id);
CREATE INDEX IF NOT EXISTS idx_certificates_date ON certificates(completion_date);

-- Disable RLS for now since we're using custom authentication
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON certificates TO authenticated;
GRANT ALL ON certificates TO anon;

-- Comment on table
COMMENT ON TABLE certificates IS 'Tracks generated certificates for completed learning modules';