export type PostStatus = "draft" | "published" | "scheduled" | "archived"
export type UserRole = "super_admin" | "admin" | "editor" | "editor_in_chief" | "managing_editor" | "author" | "reporter" | "seo_specialist" | "social_media_manager" | "affiliate_manager" | "advertisement_manager" | "reviewer" | "contributor" | "developer" | "analyst" | "read_only"
export type AdType = "banner" | "sidebar" | "in-feed" | "sticky" | "popup" | "native" | "sponsored"
export type AdPosition =
  | "home_top" | "home_mid" | "home_bottom"
  | "sidebar" | "post_top" | "post_mid" | "post_bottom"
  | "category_top"
  | "home_top_banner" | "home_sticky_top" | "home_hero_mid"
  | "home_infeed_1" | "home_infeed_2" | "home_infeed_3" | "home_infeed_4" | "home_infeed_5" | "home_infeed_6" | "home_sidebar_top"
  | "home_sidebar_mid" | "home_bottom_banner" | "home_sticky_bottom"
  | "post_in_content_1" | "post_in_content_2" | "post_in_content_3"
  | "post_sidebar_top" | "post_sidebar_mid" | "post_sidebar_bottom"
  | "post_bottom_related" | "post_sticky_bottom"
  | "category_infeed" | "category_sidebar"
  | "search_top" | "search_infeed"
  | "error_mid"
  | "global_interstitial" | "global_exit_intent"
export type SocialPlatform =
  | "twitter" | "facebook" | "instagram" | "linkedin"
  | "pinterest" | "telegram" | "whatsapp" | "reddit"
  | "medium" | "devto" | "hashnode" | "youtube_community"
  | "gmb" | "buffer" | "hootsuite" | "flipboard"
  | "bing_news" | "perplexity" | "google_news"
  | "resend" | "indexnow" | "pexels" | "openrouter"
  | "google_ai_studio"
export type IndexStatus = "pending" | "submitted" | "indexed" | "failed"
export type SocialPostStatus = "pending" | "scheduled" | "sent" | "failed" | "skipped"
export type ApiType = "direct_api" | "cj" | "shareasale" | "impact" | "rakuten" | "awin" | "flexoffers"

// ── Content Types ────────────────────────────────────────────────────────────
export type ContentType = "news" | "tutorial" | "review" | "comparison" | "buying_guide" | "evergreen" | "opinion" | "product_launch"
export type ContentAiLevel = "human" | "ai_assisted" | "ai_drafted" | "ai_generated"
export type TaskStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled"
export type TaskType = "research" | "draft" | "fact_check" | "seo_optimize" | "refresh" | "summarize" | "social_generate"
export type BriefStatus = "pending" | "approved" | "rejected" | "revision_requested"
export type FactVerdict = "verified" | "unverified" | "disputed" | "false" | "unverifiable"
export type QualityTier = "excellent" | "good" | "acceptable" | "needs_work" | "poor"
export type RefreshTrigger = "traffic_drop" | "competitor_update" | "factual_change" | "age" | "seo_degradation" | "broken_links" | "schema_error"
export type ClusterStatus = "new" | "being_covered" | "covered" | "dismissed"
export type AuditAction = "login" | "logout" | "password_change" | "role_change" | "permission_change" | "api_key_create" | "publish" | "delete" | "settings_update" | "article_edit" | "article_create"

// ── Core Entities ────────────────────────────────────────────────────────────
export interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string
  category_id: string
  subcategory_id: string
  author_id: string
  status: PostStatus
  content_type: ContentType
  ai_author_level: ContentAiLevel
  is_featured: boolean
  is_breaking: boolean
  is_sponsored: boolean
  rss_source_url: string | null
  original_source_url: string | null
  ai_rewritten: boolean
  scheduled_at: string | null
  published_at: string | null
  last_refreshed_at: string | null
  refresh_reason: string | null
  views: number
  reading_time: number
  quality_score: number | null
  quality_breakdown: Record<string, number> | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[]
  og_image: string | null
  canonical_url: string | null
  schema_markup: Record<string, any> | null
  google_indexed: boolean
  tags: string[]
  series_id: string | null
  ai_model_used: string | null
  ai_token_cost: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
}

export interface Subcategory {
  id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

export interface RssFeed {
  id: string
  category_id: string
  subcategory_id: string | null
  feed_url: string
  feed_name: string
  is_active: boolean
  auto_rewrite: boolean
  auto_publish: boolean
  last_fetched_at: string | null
  fetch_interval_minutes: number
  posts_fetched: number
  last_error: string | null
  credibility_tier: number
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
  bio: string | null
  role: UserRole
  created_at: string
}

export interface Ad {
  id: string
  name: string
  type: AdType
  position: AdPosition
  ad_code: string | null
  adsense_slot: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  impressions: number
  clicks: number
  created_at: string
}

export interface AffiliateProgram {
  id: string
  program_name: string
  website_url: string
  logo_url: string | null
  api_key: string | null
  api_secret: string | null
  tracking_base_url: string | null
  commission_rate: number | null
  cookie_duration_days: number | null
  category_id: string | null
  is_active: boolean
  auto_inject: boolean
  created_at: string
}

export interface AffiliateProduct {
  id: string
  affiliate_id: string
  program_key: string | null
  product_name: string
  product_description: string | null
  product_image_url: string | null
  affiliate_link: string
  original_price: number | null
  sale_price: number | null
  category_id: string | null
  tags: string[]
  is_featured: boolean
  is_auto_imported: boolean
  clicks: number
  conversions: number
  is_active: boolean
  created_at: string
}

export interface AffiliateProgramConfig {
  id: string
  program_key: string
  program_name: string
  logo_url: string | null
  api_type: ApiType
  credentials: Record<string, string>
  is_connected: boolean
  auto_mode: boolean
  auto_mode_interval_hours: number
  auto_mode_categories: string[]
  auto_mode_keywords: string[]
  auto_mode_max_products: number
  last_auto_run_at: string | null
  search_enabled: boolean
  total_products_imported: number
  total_clicks: number
  total_estimated_earnings: number
  created_at: string
}

export interface SocialAccount {
  id: string
  platform: SocialPlatform
  account_name: string
  credentials: Record<string, string>
  is_active: boolean
  auto_publish: boolean
  post_delay_minutes: number
  category_filter: string[] | null
  custom_template: string | null
  last_posted_at: string | null
  total_posts_sent: number
  created_at: string
}

export interface SocialPost {
  id: string
  post_id: string
  platform: SocialPlatform
  social_account_id: string
  status: SocialPostStatus
  scheduled_at: string | null
  sent_at: string | null
  platform_post_id: string | null
  content_preview: string | null
  error_message: string | null
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  parent_id: string | null
  author_name: string
  author_email: string
  content: string
  status: "pending" | "approved" | "spam"
  created_at: string
}

export interface Subscriber {
  id: string
  email: string
  name: string | null
  categories: string[]
  status: "active" | "unsubscribed" | "bounced"
  subscribed_at: string
}

export interface Series {
  id: string
  title: string
  slug: string
  description: string | null
  category_id: string | null
  created_at: string
}

export interface SiteSetting {
  key: string
  value: any
  updated_at: string
}

export interface AnalyticsEvent {
  id: string
  event_type: string
  post_id: string | null
  category_id: string | null
  page_url: string
  referrer: string | null
  user_agent: string | null
  ip_hash: string | null
  country: string | null
  ad_id: string | null
  created_at: string
}

export interface GoogleIndexingQueue {
  id: string
  url: string
  status: IndexStatus
  submitted_at: string | null
  indexed_at: string | null
  error_message: string | null
}

export interface Reaction {
  id: string
  post_id: string
  type: string
  ip_hash: string
  created_at: string
}

// ── Enterprise: AI Tasks ─────────────────────────────────────────────────────
export interface AiTask {
  id: string
  task_type: TaskType
  status: TaskStatus
  article_id: string | null
  triggered_by: string | null
  priority: number
  input_payload: Record<string, any>
  output_payload: Record<string, any>
  error_message: string | null
  model_used: string | null
  tokens_input: number
  tokens_output: number
  cost_cents: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

// ── Enterprise: Research Briefs ───────────────────────────────────────────────
export interface AiResearchBrief {
  id: string
  article_id: string | null
  topic_summary: string
  verified_facts: Array<{
    claim: string
    source_url: string
    source_title: string
    credibility_tier: number
    confidence: number
  }>
  conflicting_claims: Array<{
    claim: string
    version_a: { statement: string; source: string }
    version_b: { statement: string; source: string }
    recommendation: string
  }>
  source_urls: string[]
  suggested_angle: string
  suggested_category_id: string | null
  suggested_tags: string[]
  suggested_keyword_cluster: string[]
  status: BriefStatus
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
}

// ── Enterprise: Fact Checks ──────────────────────────────────────────────────
export interface AiFactCheck {
  id: string
  article_id: string
  claim_text: string
  claim_hash: string
  verdict: FactVerdict
  confidence_score: number
  source_url: string | null
  source_title: string | null
  checked_by: "ai" | "human" | "ai_then_human"
  reviewed_by: string | null
  review_notes: string | null
  created_at: string
}

// ── Enterprise: AI Guardrails ────────────────────────────────────────────────
export interface AiGuardrail {
  id: string
  config_key: string
  config_value: Record<string, any>
  description: string | null
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Enterprise: Story Clusters ───────────────────────────────────────────────
export interface StoryCluster {
  id: string
  topic: string
  companies: string[]
  products: string[]
  people: string[]
  item_count: number
  avg_credibility: number
  first_seen_at: string
  latest_at: string
  article_id: string | null
  status: ClusterStatus
}

// ── Enterprise: Keywords ─────────────────────────────────────────────────────
export interface Keyword {
  id: string
  keyword: string
  category_id: string | null
  search_volume: number | null
  competition_score: number | null
  intent: "informational" | "transactional" | "navigational" | "commercial"
  is_trending: boolean
  trend_started_at: string | null
  difficulty_score: number | null
  last_analyzed_at: string | null
  created_at: string
}

// ── Enterprise: Audit Log ────────────────────────────────────────────────────
export interface AuditLog {
  id: string
  user_id: string | null
  action: AuditAction
  entity_type: string
  entity_id: string | null
  old_value: Record<string, any> | null
  new_value: Record<string, any> | null
  ip_address: string | null
  created_at: string
}

// ── Enterprise: API Keys ─────────────────────────────────────────────────────
export interface ApiKey {
  id: string
  name: string
  key_hash: string
  key_prefix: string
  permissions: string[]
  expires_at: string | null
  last_used_at: string | null
  request_count: number
  is_active: boolean
  created_by: string | null
  created_at: string
}

// ── Enterprise: Integration ──────────────────────────────────────────────────
export interface Integration {
  id: string
  provider: string
  integration_type: string
  config: Record<string, any>
  is_active: boolean
  last_health_check: string | null
  health_status: "ok" | "error" | "degraded"
  created_at: string
  updated_at: string
}

// ── Enterprise: Media Assets ─────────────────────────────────────────────────
export interface MediaAsset {
  id: string
  filename: string
  original_url: string
  alt_text: string | null
  mime_type: string | null
  file_size_bytes: number | null
  width: number | null
  height: number | null
  format_variants: Record<string, string>
  licensing: string | null
  attribution: string | null
  uploaded_by: string | null
  created_at: string
}

// ── Enterprise: Competitor Keywords ──────────────────────────────────────────
export interface CompetitorKeyword {
  id: string
  competitor_domain: string
  keyword_id: string
  competitor_rank: number | null
  competitor_url: string | null
  last_checked_at: string | null
  created_at: string
}

// ── Enterprise: SEO Audits ───────────────────────────────────────────────────
export interface SeoAudit {
  id: string
  article_id: string
  audit_type: "on_page" | "technical" | "content"
  score: number
  findings: Array<{ type: string; severity: string; message: string }>
  recommendations: string[]
  ran_at: string
}

// ── Enterprise: Revenue Events ───────────────────────────────────────────────
export interface RevenueEvent {
  id: string
  revenue_type: "ad_impression" | "ad_click" | "affiliate_click" | "affiliate_conversion" | "subscription" | "one_time"
  amount_cents: number
  currency: string
  article_id: string | null
  subscriber_id: string | null
  source: string | null
  metadata: Record<string, any>
  recorded_at: string
}

// ── Enterprise: Social Metrics ───────────────────────────────────────────────
export interface SocialMetric {
  id: string
  article_id: string
  platform: string
  post_id: string | null
  impressions: number
  clicks: number
  shares: number
  comments: number
  likes: number
  engagement_rate: number | null
  posted_at: string | null
  last_checked_at: string | null
  created_at: string
}
