-- Create module_feedback table to store user feedback on completed modules
CREATE TABLE IF NOT EXISTS module_feedback (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL, -- Changed from UUID to TEXT to match your profile_id system
    module_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    feedback_text TEXT,
    suggestions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one feedback per user per module
    UNIQUE(user_id, module_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_module_feedback_user_module ON module_feedback(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_module_feedback_module ON module_feedback(module_id);
CREATE INDEX IF NOT EXISTS idx_module_feedback_rating ON module_feedback(rating);

-- Disable RLS for now since we're using custom authentication
ALTER TABLE module_feedback DISABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_module_feedback_updated_at 
    BEFORE UPDATE ON module_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment on table
COMMENT ON TABLE module_feedback IS 'Stores user feedback and ratings for completed learning modules';

-- Grant permissions for authenticated users
GRANT ALL ON module_feedback TO authenticated;
GRANT ALL ON module_feedback TO anon;