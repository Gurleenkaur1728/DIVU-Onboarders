-- Questions and FAQs Database Tables
-- Run this script in your Supabase SQL editor

-- 1. FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    id BIGSERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Questions Table
CREATE TABLE IF NOT EXISTS user_questions (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
    answered_by TEXT REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_faqs_published ON faqs(is_published);
CREATE INDEX IF NOT EXISTS idx_user_questions_user_id ON user_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questions_status ON user_questions(status);

-- 4. RLS (Row Level Security) Policies
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_questions ENABLE ROW LEVEL SECURITY;

-- FAQ Policies (everyone can read published FAQs)
CREATE POLICY "Anyone can view published FAQs" ON faqs
    FOR SELECT USING (is_published = true);

CREATE POLICY "Only admins can manage FAQs" ON faqs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role_id IN (2, 3) -- Admin or Super Admin
        )
    );

-- User Questions Policies (users can only see their own questions)
CREATE POLICY "Users can view their own questions" ON user_questions
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own questions" ON user_questions
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Admins can view all questions" ON user_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role_id IN (2, 3) -- Admin or Super Admin
        )
    );

CREATE POLICY "Admins can update all questions" ON user_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role_id IN (2, 3) -- Admin or Super Admin
        )
    );

CREATE POLICY "Admins can delete all questions" ON user_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.role_id IN (2, 3) -- Admin or Super Admin
        )
    );

-- 5. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Apply triggers
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_questions_updated_at BEFORE UPDATE ON user_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Sample FAQ data (optional)
INSERT INTO faqs (question, answer, is_published) VALUES
('What is the onboarding process?', 'Our onboarding process includes completing modules, attending events, and finishing your checklist items.', true),
('How do I access my certificate?', 'Complete all module sections and submit feedback to access your certificate.', true),
('Who can I contact for help?', 'You can ask questions through the Questions page or contact your supervisor.', true)
ON CONFLICT DO NOTHING;