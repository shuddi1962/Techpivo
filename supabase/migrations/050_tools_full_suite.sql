-- 050_tools_full_suite.sql
-- (1) Seed 17 new tools that now have real client-side components (registry in src/lib/tools*.tsx)
-- (2) Deactivate 8 tools that can't work realistically without external APIs
-- (3) bump_tool_usage() SECURITY DEFINER RPC for public usage tracking (public /tools pages)
-- (4) Add tools + tool_usage to supabase_realtime publication (admin tool pages go live)

-- ============ 1. Seed new tools ============
INSERT INTO tools (name, slug, description, category, icon, is_ai_tool) VALUES
  ('Regex Tester',            'regex-tester',            'Test regular expressions live with match highlighting', 'developer',   'regex',      false),
  ('CSV to JSON',             'csv-json',                'Convert CSV to JSON and back with delimiter options',   'developer',   'table',      false),
  ('UUID Generator',          'uuid-generator',          'Generate v4 UUIDs individually or in bulk',             'developer',   'fingerprint',false),
  ('JWT Decoder',             'jwt-decoder',             'Decode JWT header and payload locally, no sending',    'developer',   'key-round',  false),
  ('Unix Timestamp',          'unix-timestamp',          'Convert between Unix time and human-readable dates',   'developer',   'clock',      false),
  ('Cron Generator',          'cron-generator',          'Build cron expressions with visual presets',           'developer',   'timer',      false),
  ('Lorem Ipsum Generator',   'lorem-ipsum',             'Generate placeholder text with configurable length',  'developer',   'file-text',  false),
  ('Markdown Preview',        'markdown-preview',        'Write Markdown and preview rendered HTML side by side','developer',  'bot',        false),
  ('Text Case Converter',     'text-case',               'Convert text to title case, camelCase, snake_case',    'developer',   'case-sensitive', false),
  ('Slug Generator',          'slug-generator',          'Turn any title into a URL-friendly slug',              'developer',   'link',       false),
  ('Random String Generator', 'random-string',           'Generate random strings with custom charsets',         'security',    'shuffle',    false),
  ('Random Number Generator', 'random-number',           'Generate random numbers in any range',                 'security',    'dices',      false),
  ('Credit Card Validator',   'credit-card-validator',   'Validate card numbers with the Luhn algorithm',        'security',    'credit-card',false),
  ('Age Calculator',          'age-calculator',          'Exact age in years, months, days, and next birthday',  'calculator',  'cake',       false),
  ('Date Calculator',         'date-calculator',         'Add or subtract time, or count days between dates',    'calculator',  'calendar',   false),
  ('Base Converter',          'base-converter',          'Convert numbers between bases 2-36',                   'calculator',  'calculator', false),
  ('BMI Calculator',          'bmi-calculator',          'Body Mass Index with category and healthy range',      'calculator',  'activity',   false)
ON CONFLICT (slug) DO NOTHING;

-- ============ 2. Deactivate tools that cannot work realistically without external APIs ============
-- json-validator merged into json-formatter; xml/yaml need parser libs (removed);
-- whois/ssl/currency/background-removal/pdf-to-word need paid/ML/external APIs (removed).
UPDATE tools SET is_active = false, updated_at = NOW()
WHERE slug IN ('json-validator', 'xml-formatter', 'yaml-formatter', 'whois-lookup',
               'ssl-checker', 'background-remover', 'pdf-to-word', 'currency-converter');

-- Keep DB descriptions in sync with the real components
UPDATE tools SET description = 'Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes', updated_at = NOW()
WHERE slug = 'hash-generator';
UPDATE tools SET description = 'Format, validate, and minify JSON with error detection', updated_at = NOW()
WHERE slug = 'json-formatter';
UPDATE tools SET description = 'Look up A, AAAA, MX, TXT, and more records (Cloudflare DNS)', updated_at = NOW()
WHERE slug = 'dns-checker';

-- ============ 3. bump_tool_usage RPC ============
CREATE OR REPLACE FUNCTION public.bump_tool_usage(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tool_id UUID;
  v_ip TEXT;
BEGIN
  SELECT id INTO v_tool_id FROM tools WHERE slug = p_slug LIMIT 1;
  IF v_tool_id IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    v_ip := NULLIF((current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for'), '');
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  INSERT INTO tool_usage (tool_id, user_ip, created_at)
  VALUES (v_tool_id, v_ip, NOW());

  UPDATE tools SET usage_count = usage_count + 1, updated_at = NOW()
  WHERE id = v_tool_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_tool_usage(TEXT) TO anon, authenticated, service_role;

-- ============ 4. Realtime publication ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tools') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tools;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tool_usage') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tool_usage;
  END IF;
END $$;