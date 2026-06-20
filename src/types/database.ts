export type PostStatus = "draft" | "published" | "scheduled" | "archived"
export type UserRole = "admin" | "editor" | "author" | "contributor"
export type AdType = "banner" | "sidebar" | "in-feed" | "sticky" | "popup"
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
  is_featured: boolean
  is_breaking: boolean
  is_sponsored: boolean
  rss_source_url: string | null
  original_source_url: string | null
  ai_rewritten: boolean
  scheduled_at: string | null
  published_at: string | null
  views: number
  reading_time: number
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[]
  og_image: string | null
  canonical_url: string | null
  google_indexed: boolean
  tags: string[]
  series_id: string | null
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
