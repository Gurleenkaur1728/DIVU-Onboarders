-- Add new columns to users table for enhanced account page
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS manager TEXT,
ADD COLUMN IF NOT EXISTS employment_type TEXT,
ADD COLUMN IF NOT EXISTS salary NUMERIC;

-- Optional: Update existing users with sample data (remove if not needed)
-- UPDATE users SET 
--   hire_date = '2024-01-15',
--   department = 'Technology',
--   position = 'Software Developer',
--   manager = 'John Smith',
--   employment_type = 'Full-Time',
--   salary = 75000
-- WHERE department IS NULL;

-- Check the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
