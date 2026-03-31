-- =============================================
-- KingsIQ Database Schema
-- Kings' Education Dubai
-- Phase 1 - Foundation
-- =============================================

-- 1. User profiles (extends Supabase built-in auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'marketing' CHECK (role IN ('marketing', 'management', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Kings' own three schools
CREATE TABLE IF NOT EXISTS kings_schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  facebook_page_url TEXT,
  instagram_handle TEXT,
  khda_rating TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Competitor schools (up to 5)
CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT,
  facebook_page_url TEXT,
  instagram_handle TEXT,
  khda_rating TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Facebook community groups to monitor
CREATE TABLE IF NOT EXISTS facebook_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  group_url TEXT NOT NULL UNIQUE,
  join_status TEXT DEFAULT 'joined' CHECK (join_status IN ('pending', 'joined', 'declined')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Keywords to track for mentions
CREATE TABLE IF NOT EXISTS keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Email alert settings per keyword
CREATE TABLE IF NOT EXISTS email_alert_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Social media data snapshots (Module 1)
CREATE TABLE IF NOT EXISTS social_media_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_type TEXT NOT NULL CHECK (school_type IN ('kings', 'competitor')),
  school_name TEXT NOT NULL,
  school_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  facebook_page_name TEXT,
  follower_count INTEGER DEFAULT 0,
  post_count_reel INTEGER DEFAULT 0,
  post_count_carousel INTEGER DEFAULT 0,
  post_count_static INTEGER DEFAULT 0,
  post_count_story INTEGER DEFAULT 0,
  source_url TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Keyword mentions found (Module 2)
CREATE TABLE IF NOT EXISTS keyword_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
  keyword_text TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_reviews', 'blog', 'facebook_group')),
  source_name TEXT,
  content_snippet TEXT,
  source_url TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Competitor ad screenshots (Module 3)
CREATE TABLE IF NOT EXISTS ad_screenshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  screenshot_path TEXT,
  source_url TEXT,
  is_new BOOLEAN DEFAULT TRUE,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Ranking weight settings (Module 2 sliders)
CREATE TABLE IF NOT EXISTS ranking_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  khda_weight NUMERIC DEFAULT 25,
  instagram_weight NUMERIC DEFAULT 25,
  blog_mentions_weight NUMERIC DEFAULT 25,
  social_listening_weight NUMERIC DEFAULT 25,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Scrape run logs
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- SEED DATA
-- =============================================

INSERT INTO kings_schools (name, khda_rating) VALUES
  ('Kings'' School Dubai', 'Outstanding'),
  ('Kings'' School Al Barsha', 'Outstanding'),
  ('Kings'' School Nad Al Sheba', 'Very Good')
ON CONFLICT DO NOTHING;

INSERT INTO competitors (name, website_url) VALUES
  ('Repton Dubai', 'https://www.reptondubai.org/'),
  ('Repton Al Barsha', 'https://www.reptonalbarsha.org/'),
  ('JESS Dubai', 'https://www.jess.sch.ae/'),
  ('DBS', 'https://www.dubaibritishschooljp.ae/'),
  ('GEMS', 'https://gems-sri.com/')
ON CONFLICT DO NOTHING;

INSERT INTO facebook_groups (group_url) VALUES
  ('https://www.facebook.com/groups/333790940005370/'),
  ('https://www.facebook.com/groups/1426675601145862/'),
  ('https://www.facebook.com/groups/DubaiSchoolGuide/')
ON CONFLICT DO NOTHING;

INSERT INTO keywords (keyword, is_default) VALUES
  ('Kings'' School Dubai', TRUE),
  ('Kings'' School Al Barsha', TRUE),
  ('Kings'' School Nad Al Sheba', TRUE),
  ('Kings'' Education', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO ranking_weights (khda_weight, instagram_weight, blog_mentions_weight, social_listening_weight)
VALUES (25, 25, 25, 25);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kings_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_profiles" ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_kings_schools" ON kings_schools FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_competitors" ON competitors FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_facebook_groups" ON facebook_groups FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_keywords" ON keywords FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_email_alerts" ON email_alert_configs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_snapshots" ON social_media_snapshots FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_mentions" ON keyword_mentions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_ads" ON ad_screenshots FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_weights" ON ranking_weights FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "read_logs" ON scrape_logs FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "write_competitors" ON competitors FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_kings_schools" ON kings_schools FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_facebook_groups" ON facebook_groups FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_keywords" ON keywords FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_email_alerts" ON email_alert_configs FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_snapshots" ON social_media_snapshots FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_mentions" ON keyword_mentions FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_ads" ON ad_screenshots FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_weights" ON ranking_weights FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "write_logs" ON scrape_logs FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "own_profile" ON profiles FOR ALL TO authenticated USING (auth.uid() = id);
