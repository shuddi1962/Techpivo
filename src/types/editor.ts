export interface EditorPostState {
  id?: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image: string
  category_id: string
  subcategory_id: string
  author_id: string
  tags: string[]
  status: "draft" | "published" | "scheduled" | "archived"
  focus_keyword: string
  seo_title: string
  seo_description: string
  seo_keywords: string[]
  seo_score: number
  canonical_url: string
  robots_noindex: boolean
  robots_nofollow: boolean
  breadcrumb_title: string
  og_title: string
  og_description: string
  og_image: string
  twitter_title: string
  twitter_description: string
  twitter_image: string
  schema_type: string
  schema_data: Record<string, unknown> | null
  post_format: string
  is_sticky: boolean
  enable_comments: boolean
  readability_score: number
  flesch_score: number
  secondary_keywords: string[]
  quick_brief: Record<string, unknown> | null
  blizine_score: number
  is_featured: boolean
  is_breaking: boolean
  is_sponsored: boolean
  series_id: string
  reading_time: number
  published_at: string | null
  scheduled_at: string | null
  source_name: string
  original_source_url: string
  rss_source_url: string
}

export interface PreviewDraft {
  id: string
  post_id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image: string
  created_at: string
  expires_at: string
}

export interface SeoChecklistItem {
  id: string
  label: string
  weight: number
  check: (state: EditorPostState) => boolean
}

export interface SerpPreview {
  title: string
  url: string
  description: string
}

export interface SocialPreview {
  platform: "facebook" | "twitter"
  title: string
  description: string
  image: string
}

export type AiWritingMode = "generate" | "improve" | "keyword_research"
