-- ─────────────────────────────────────────────────────────────────────────────
-- meta_ads_results — stores every ad scraped from Meta Ads Library
-- History is preserved — rows are never deleted, just added each scrape run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meta_ads_results (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id        TEXT         NOT NULL,
  school_name      TEXT         NOT NULL,
  library_id       TEXT         NOT NULL,          -- Meta Library ID (e.g. "1209322890600861")
  started_running  TEXT,                           -- "21 May 2025"
  platforms        JSONB        DEFAULT '[]',      -- ["Facebook","Instagram"]
  caption          TEXT,                           -- Ad body text (up to 600 chars)
  cta              TEXT,                           -- "Learn more", "Book now", etc.
  ad_type          TEXT         DEFAULT 'Static',  -- "Static" | "Video" | "Carousel"
  screenshot_url   TEXT,                           -- "/screenshots/meta/meta_{id}_{lib}.png"
  ad_link          TEXT,                           -- https://facebook.com/ads/library/?id=...
  audience_category TEXT        DEFAULT 'others',  -- auto-detected, user-editable
  scrape_date      DATE         NOT NULL,          -- Monday this scrape was run
  scraped_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- Add ad_type to existing tables (safe to run on a table that already exists)
ALTER TABLE meta_ads_results
  ADD COLUMN IF NOT EXISTS ad_type TEXT DEFAULT 'Static';

-- Indexes for fast filtering by school+date and by date alone
CREATE INDEX IF NOT EXISTS idx_meta_ads_school_date
  ON meta_ads_results (school_id, scrape_date);

CREATE INDEX IF NOT EXISTS idx_meta_ads_scrape_date
  ON meta_ads_results (scrape_date DESC);

-- Allow the frontend (anon key) to read rows
ALTER TABLE meta_ads_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON meta_ads_results
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all" ON meta_ads_results
  FOR ALL USING (true);
