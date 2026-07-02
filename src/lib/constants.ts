export const SITE_NAME = "Techpivo"
export const SITE_TAGLINE = "Tech, decoded. Fast."
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"

export const CANONICAL_DOMAIN = "techpivo.com"
export const SITE_LOGO = "Techpivo"
export const PRIMARY_COLOR = "#0F172A"
export const ACCENT_COLOR = "#F59E0B"
export const HIGHLIGHT_COLOR = "#F59E0B"

export const CATEGORY_COLORS: Record<string, string> = {
  "tech-news": "#3B82F6",
  "web-development": "#F59E0B",
  programming: "#10B981",
  cybersecurity: "#EF4444",
  "ai-automation": "#F59E0B",
  gadgets: "#EC4899",
  tutorials: "#14B8A6",
  "digital-business": "#F59E0B",
  "networking-it-support": "#F97316",
  reviews: "#06B6D4",
}

export const AD_POSITIONS = {
  home_top_banner: "970×90 Leaderboard",
  home_sticky_top: "728×90 Sticky Top",
  home_hero_mid: "300×250 Rectangle",
  home_infeed_1: "In-feed #1",
  home_infeed_2: "In-feed #2",
  home_infeed_3: "In-feed #3",
  home_infeed_4: "In-feed #4",
  home_infeed_5: "In-feed #5",
  home_infeed_6: "In-feed #6",
  home_infeed_7: "In-feed #7",
  home_infeed_8: "In-feed #8",
  home_sidebar_top: "300×250 Sidebar",
  home_sidebar_mid: "300×600 Half Page",
  home_bottom_banner: "728×90 Bottom",
  post_top_banner: "728×90 Post Top",
  post_in_content_1: "336×280 In-content #1",
  post_in_content_2: "336×280 In-content #2",
  post_in_content_3: "336×280 In-content #3",
  post_sidebar_top: "300×250 Post Sidebar",
  post_sidebar_mid: "300×600 Post Sidebar",
  post_sidebar_bottom: "300×250 Post Sidebar Bottom",
  category_top_banner: "728×90 Category Top",
  category_infeed: "In-feed Category",
  category_sidebar: "300×250 Category",
} as const

export const SOCIAL_PLATFORMS = [
  "twitter", "facebook", "instagram", "linkedin",
  "pinterest", "telegram", "whatsapp", "reddit",
  "medium", "devto", "hashnode", "youtube_community",
  "gmb", "flipboard",
  "bing_news", "perplexity", "google_news",
  "resend", "indexnow", "pexels", "openrouter",
  "google_ai_studio",
] as const

export const AFFILIATE_PROGRAMS = [
  { key: "amazon", name: "Amazon Associates" },
  { key: "ebay", name: "eBay Partner Network" },
  { key: "aliexpress", name: "AliExpress Affiliate" },
  { key: "walmart", name: "Walmart Affiliate" },
  { key: "bestbuy", name: "Best Buy Affiliate" },
  { key: "newegg", name: "Newegg Affiliate" },
  { key: "envato", name: "Envato Market" },
  { key: "udemy", name: "Udemy Affiliate" },
  { key: "coursera", name: "Coursera Affiliate" },
  { key: "bluehost", name: "Bluehost Affiliate" },
  { key: "hostinger", name: "Hostinger Affiliate" },
  { key: "cj", name: "Commission Junction" },
  { key: "shareasale", name: "ShareASale" },
  { key: "impact", name: "Impact Radius" },
  { key: "rakuten", name: "Rakuten Advertising" },
  { key: "awin", name: "Awin" },
  { key: "nordvpn", name: "NordVPN" },
  { key: "booking", name: "Booking.com" },
]
