-- =================================================================
-- Database Schema for The Financial Modeller Platform
-- =================================================================

-- Contact Submissions Table (Existing)
-- This table stores contact form submissions from the website
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'new',
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modeller Signups Table (New)
-- This table stores applications from financial modellers who want to join the marketplace
CREATE TABLE IF NOT EXISTS modeller_signups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    experience TEXT NOT NULL,
    specialization TEXT NOT NULL,
    portfolio_url TEXT,
    linkedin_url TEXT,
    interests TEXT[] NOT NULL,
    message TEXT,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'pending',
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at);

CREATE INDEX IF NOT EXISTS idx_modeller_signups_email ON modeller_signups(email);
CREATE INDEX IF NOT EXISTS idx_modeller_signups_status ON modeller_signups(status);
CREATE INDEX IF NOT EXISTS idx_modeller_signups_created_at ON modeller_signups(created_at);
CREATE INDEX IF NOT EXISTS idx_modeller_signups_specialization ON modeller_signups(specialization);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables
DROP TRIGGER IF EXISTS update_contact_submissions_updated_at ON contact_submissions;
CREATE TRIGGER update_contact_submissions_updated_at
    BEFORE UPDATE ON contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_modeller_signups_updated_at ON modeller_signups;
CREATE TRIGGER update_modeller_signups_updated_at
    BEFORE UPDATE ON modeller_signups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on tables
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeller_signups ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to perform all operations
CREATE POLICY "Service role can perform all operations on contact_submissions"
    ON contact_submissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can perform all operations on modeller_signups"
    ON modeller_signups
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy to allow authenticated users to view their own submissions
CREATE POLICY "Users can view their own contact submissions"
    ON contact_submissions
    FOR SELECT
    TO authenticated
    USING (email = auth.email());

CREATE POLICY "Users can view their own modeller signups"
    ON modeller_signups
    FOR SELECT
    TO authenticated
    USING (email = auth.email());

-- Comments for documentation
COMMENT ON TABLE modeller_signups IS 'Stores applications from financial modellers who want to join the marketplace to sell templates, styles, and modules';
COMMENT ON COLUMN modeller_signups.first_name IS 'Modeller first name';
COMMENT ON COLUMN modeller_signups.last_name IS 'Modeller last name';
COMMENT ON COLUMN modeller_signups.email IS 'Modeller email address';
COMMENT ON COLUMN modeller_signups.phone IS 'Optional phone number';
COMMENT ON COLUMN modeller_signups.experience IS 'Years of experience: 1-3, 3-5, 5-10, or 10+';
COMMENT ON COLUMN modeller_signups.specialization IS 'Area of specialization: startup, saas, ecommerce, real-estate, services, fundraising, or other';
COMMENT ON COLUMN modeller_signups.portfolio_url IS 'URL to modeller portfolio or website';
COMMENT ON COLUMN modeller_signups.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN modeller_signups.interests IS 'Array of interests: templates, styles, and/or modules';
COMMENT ON COLUMN modeller_signups.message IS 'Additional information about the modeller experience and contributions';
COMMENT ON COLUMN modeller_signups.terms_accepted IS 'Whether the modeller accepted the terms and conditions';
COMMENT ON COLUMN modeller_signups.status IS 'Application status: pending, approved, rejected';
COMMENT ON COLUMN modeller_signups.archived IS 'Whether the application has been archived';
