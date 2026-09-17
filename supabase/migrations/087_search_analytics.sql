-- Search Analytics Tracking for Viral Growth Engine
-- Tracks search queries, click-through rates, and engagement metrics

CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    result_type TEXT NOT NULL CHECK (result_type IN ('post', 'community', 'tool', 'page')),
    result_id UUID NULL, -- References the specific item clicked (post.id, forum_posts.id, etc.)
    clicked BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0, -- Position in search results (1-based)
    user_id UUID NULL, -- Optional: authenticated user
    session_id TEXT NULL, -- For anonymous users
    ip_address INET NULL,
    user_agent TEXT NULL,
    referrer TEXT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Engagement metrics
    dwell_time INTEGER NULL, -- Time spent on result page in seconds
    bounce BOOLEAN NULL, -- Whether user bounced back quickly
    conversion BOOLEAN DEFAULT FALSE -- Whether user took desired action after clicking
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_result ON search_analytics(result_type, result_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_session ON search_analytics(session_id);

-- RLS Policies
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert search analytics"
    ON search_analytics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view search analytics"
    ON search_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor', 'manager')
        )
    );

-- Allow service role full access
CREATE POLICY "Service role has full access"
    ON search_analytics
    USING (true)
    WITH CHECK (true);