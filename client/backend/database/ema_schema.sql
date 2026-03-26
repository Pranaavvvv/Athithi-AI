-- ENUMS (if not already existing from Python, we use simple VARCHARs for safety in Node to avoid type mismatch, but we'll stick to PostgreSQL Enums if possible. For simplicity let's use VARCHAR constraints)
-- Note: 'events' table is managed by the Python agent. We just reference it.

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location_coords VARCHAR(255),
    historical_reliability_score DECIMAL(3, 1) DEFAULT 5.0,
    base_price_point DECIMAL(12, 2)
);

CREATE TABLE IF NOT EXISTS vendor_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    quoted_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ops_coordination (
    id SERIAL PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    department VARCHAR(50) NOT NULL,
    is_ready BOOLEAN DEFAULT FALSE,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, department)
);

-- Seed some dummy vendors so the AI has data to rank
INSERT INTO vendors (name, category, location_coords, historical_reliability_score, base_price_point)
VALUES
    ('Floral Dreams Decor', 'decor', '19.0760, 72.8777', 9.2, 25000),
    ('Elite Event Styling', 'decor', '19.0800, 72.8800', 7.5, 18000),
    ('Premium Sound & Lights', 'sound', '19.0900, 72.8500', 9.8, 15000),
    ('DJ Maxx Beats', 'dj', '19.1000, 72.8600', 8.0, 12000),
    ('Gourmet Royal Caterers', 'kitchen', '19.0500, 72.9000', 9.5, 1200),
    ('City Spice Catering', 'kitchen', '19.0400, 72.9100', 8.2, 800)
ON CONFLICT DO NOTHING;
