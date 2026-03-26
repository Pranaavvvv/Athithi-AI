-- =============================================
-- Simplified User Authentication Database Schema
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    
    -- Core identification
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255),
    
    -- Google OAuth
    google_id VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(50) DEFAULT 'local', -- 'local' or 'google'
    
    -- Role management
    role VARCHAR(50) DEFAULT 'client', -- 'admin', 'event_manager', 'finance_manager', 'gre', 'client'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Note: The database requires PostgreSQL 17+ for native uuidv7() support.
