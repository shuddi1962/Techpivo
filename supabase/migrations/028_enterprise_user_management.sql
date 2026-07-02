-- Enterprise User Management, Security & API Tables

-- Granular Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Permissions Junction
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Custom Roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '["read"]',
  rate_limit INT DEFAULT 1000,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  request_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Key Usage Logs
CREATE TABLE IF NOT EXISTS api_key_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT,
  method TEXT,
  status_code INT,
  response_time_ms INT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Activity Log
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Editorial Workflow
CREATE TABLE IF NOT EXISTS editorial_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article Workflow State
CREATE TABLE IF NOT EXISTS article_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES editorial_workflows(id),
  current_step INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article Versions
CREATE TABLE IF NOT EXISTS article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  tags TEXT[],
  meta JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  change_summary TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article Comments (Editorial)
CREATE TABLE IF NOT EXISTS article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  line_number INT,
  resolved BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES article_comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_api_key_id ON api_key_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_article_workflow_post_id ON article_workflow(post_id);
CREATE INDEX IF NOT EXISTS idx_article_versions_post_id ON article_versions(post_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_post_id ON article_comments(post_id);

-- RLS Policies
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage permissions" ON permissions
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can manage role_permissions" ON role_permissions
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can manage custom_roles" ON custom_roles
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can view audit_logs" ON audit_logs
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can manage api_keys" ON api_keys
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can view api_key_logs" ON api_key_logs
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Users can view own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON user_activity
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can manage editorial_workflows" ON editorial_workflows
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Users can view article_workflow" ON article_workflow
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor', 'author')));

CREATE POLICY "Admins can manage article_workflow" ON article_workflow
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor')));

CREATE POLICY "Users can view article_versions" ON article_versions
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor', 'author')));

CREATE POLICY "Users can create article_versions" ON article_versions
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor', 'author')));

CREATE POLICY "Users can view article_comments" ON article_comments
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor', 'author')));

CREATE POLICY "Users can manage article_comments" ON article_comments
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'editor', 'author')));

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  ('posts.create', 'Create posts', 'Posts'),
  ('posts.edit', 'Edit posts', 'Posts'),
  ('posts.delete', 'Delete posts', 'Posts'),
  ('posts.publish', 'Publish posts', 'Posts'),
  ('posts.schedule', 'Schedule posts', 'Posts'),
  ('posts.restore', 'Restore posts', 'Posts'),
  ('seo.view', 'View SEO data', 'SEO'),
  ('seo.edit', 'Edit SEO settings', 'SEO'),
  ('seo.approve', 'Approve SEO changes', 'SEO'),
  ('analytics.view', 'View analytics', 'Analytics'),
  ('analytics.export', 'Export analytics', 'Analytics'),
  ('ai.generate', 'Generate AI content', 'AI'),
  ('ai.research', 'Use AI research', 'AI'),
  ('ai.approve', 'Approve AI content', 'AI'),
  ('media.upload', 'Upload media', 'Media'),
  ('media.delete', 'Delete media', 'Media'),
  ('users.invite', 'Invite users', 'Users'),
  ('users.suspend', 'Suspend users', 'Users'),
  ('users.delete', 'Delete users', 'Users'),
  ('settings.view', 'View settings', 'Settings'),
  ('settings.edit', 'Edit settings', 'Settings'),
  ('integrations.manage', 'Manage integrations', 'Integrations'),
  ('ads.manage', 'Manage advertisements', 'Ads'),
  ('affiliate.manage', 'Manage affiliates', 'Affiliate'),
  ('social.manage', 'Manage social accounts', 'Social'),
  ('newsletter.manage', 'Manage newsletter', 'Newsletter'),
  ('reports.view', 'View reports', 'Reports'),
  ('reports.export', 'Export reports', 'Reports')
ON CONFLICT DO NOTHING;

-- Insert default editorial workflow
INSERT INTO editorial_workflows (name, steps, is_default) VALUES
  ('Standard', '[{"name":"Draft","role":"author"},{"name":"AI Review","role":"system"},{"name":"Editor Review","role":"editor"},{"name":"SEO Review","role":"editor"},{"name":"Publish","role":"admin"}]', true),
  ('Fast Track', '[{"name":"Draft","role":"author"},{"name":"Editor Review","role":"editor"},{"name":"Publish","role":"admin"}]', false),
  ('Full Review', '[{"name":"Draft","role":"author"},{"name":"AI Review","role":"system"},{"name":"Editor Review","role":"editor"},{"name":"SEO Review","role":"editor"},{"name":"Legal Review","role":"admin"},{"name":"Editor-in-Chief","role":"admin"},{"name":"Publish","role":"admin"}]', false)
ON CONFLICT DO NOTHING;
