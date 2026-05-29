// lib/rss-feeds.ts

export interface RssFeed {
  name:     string
  url:      string
  category: string   // must match category slug exactly
  priority: number   // 1 = highest, 3 = lowest — controls daily slot allocation
}

// 49 feeds across 11 categories
// Priority 1 = gets more of the 50 daily slots
// Priority 2 = standard allocation
// Priority 3 = gets slots only after P1 and P2 are served

export const RSS_FEEDS: RssFeed[] = [

  // ── TECH NEWS (12 feeds) ─────────────────────────────────────────────────
  { name: 'The Verge',        url: 'https://www.theverge.com/rss/index.xml',                                                                          category: 'tech-news', priority: 1 },
  { name: 'TechCrunch',       url: 'https://techcrunch.com/feed/',                                                                                    category: 'tech-news', priority: 1 },
  { name: 'Ars Technica',     url: 'https://feeds.arstechnica.com/arstechnica/index',                                                                  category: 'tech-news', priority: 1 },
  { name: 'Wired',            url: 'https://www.wired.com/feed/rss',                                                                                   category: 'tech-news', priority: 2 },
  { name: 'Engadget',         url: 'https://www.engadget.com/rss.xml',                                                                                 category: 'tech-news', priority: 2 },
  { name: 'CNET',             url: 'https://www.cnet.com/rss/all/',                                                                                    category: 'tech-news', priority: 2 },
  { name: 'Gizmodo',          url: 'https://gizmodo.com/feed/rss',                                                                                     category: 'tech-news', priority: 2 },
  { name: 'TechRadar',        url: 'https://www.techradar.com/feeds/rss/news.xml',                                                                     category: 'tech-news', priority: 2 },
  { name: 'ZDNet',            url: 'https://www.zdnet.com/news/rss.xml',                                                                               category: 'tech-news', priority: 2 },
  { name: 'Mashable Tech',    url: 'https://mashable.com/feeds/rss/tech.xml',                                                                          category: 'tech-news', priority: 3 },
  { name: "Tom's Guide",      url: 'https://www.tomsguide.com/feeds/rss2/news.xml',                                                                    category: 'tech-news', priority: 3 },
  { name: 'MIT Tech Review',  url: 'https://www.technologyreview.com/stories.rss',                                                                     category: 'tech-news', priority: 3 },

  // ── AI & AUTOMATION (4 feeds) ────────────────────────────────────────────
  { name: 'VentureBeat AI',   url: 'https://venturebeat.com/category/ai/feed/',                                                                        category: 'ai-automation', priority: 1 },
  { name: 'TechCrunch AI',    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',                                                    category: 'ai-automation', priority: 1 },
  { name: 'Ars Technica AI',  url: 'https://feeds.arstechnica.com/arstechnica/ai',                                                                     category: 'ai-automation', priority: 2 },
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', category: 'ai-automation', priority: 2 },

  // ── CYBERSECURITY (5 feeds) ──────────────────────────────────────────────
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/',                                                                           category: 'cybersecurity', priority: 1 },
  { name: 'The Hacker News',  url: 'https://feeds.feedburner.com/TheHackersNews',                                                                      category: 'cybersecurity', priority: 1 },
  { name: 'SecurityWeek',     url: 'https://www.securityweek.com/feed/',                                                                               category: 'cybersecurity', priority: 2 },
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/',                                                                               category: 'cybersecurity', priority: 2 },
  { name: 'Threatpost',       url: 'https://threatpost.com/feed/',                                                                                     category: 'cybersecurity', priority: 3 },

  // ── GADGETS (8 feeds) ────────────────────────────────────────────────────
  { name: '9to5Mac',          url: 'https://9to5mac.com/feed/',                                                                                        category: 'gadgets', priority: 1 },
  { name: '9to5Google',       url: 'https://9to5google.com/feed/',                                                                                     category: 'gadgets', priority: 1 },
  { name: 'Android Authority', url: 'https://www.androidauthority.com/feed/',                                                                          category: 'gadgets', priority: 1 },
  { name: 'MacRumors',        url: 'https://feeds.macrumors.com/MacRumors-All',                                                                        category: 'gadgets', priority: 2 },
  { name: 'AppleInsider',     url: 'https://appleinsider.com/rss/news/',                                                                               category: 'gadgets', priority: 2 },
  { name: 'GSMArena',         url: 'https://www.gsmarena.com/rss-news-reviews.php3',                                                                   category: 'gadgets', priority: 2 },
  { name: 'PCMag Gadgets',    url: 'https://www.pcmag.com/feeds/rss/software',                                                                        category: 'gadgets', priority: 3 },
  { name: "Tom's Hardware",   url: 'https://www.tomshardware.com/feeds/all',                                                                           category: 'gadgets', priority: 3 },

  // ── PROGRAMMING (5 feeds) ────────────────────────────────────────────────
  { name: 'Dev.to',           url: 'https://dev.to/feed',                                                                                              category: 'programming', priority: 1 },
  { name: 'GitHub Blog',      url: 'https://github.blog/feed/',                                                                                        category: 'programming', priority: 1 },
  { name: 'Stack Overflow',   url: 'https://stackoverflow.blog/feed/',                                                                                 category: 'programming', priority: 2 },
  { name: 'Hacker News Best', url: 'https://hnrss.org/best',                                                                                           category: 'programming', priority: 2 },
  { name: 'freeCodeCamp',     url: 'https://www.freecodecamp.org/news/rss/',                                                                           category: 'programming', priority: 3 },

  // ── WEB DEVELOPMENT (3 feeds) ────────────────────────────────────────────
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/',                                                                          category: 'web-development', priority: 1 },
  { name: 'CSS-Tricks',       url: 'https://css-tricks.com/feed/',                                                                                     category: 'web-development', priority: 2 },
  { name: 'web.dev',          url: 'https://web.dev/feed.xml',                                                                                         category: 'web-development', priority: 2 },

  // ── TUTORIALS (2 feeds) ──────────────────────────────────────────────────
  { name: 'How-To Geek',      url: 'https://www.howtogeek.com/feed/',                                                                                  category: 'tutorials', priority: 1 },
  { name: 'MakeUseOf',        url: 'https://www.makeuseof.com/feed/',                                                                                  category: 'tutorials', priority: 1 },

  // ── DIGITAL BUSINESS (3 feeds) ───────────────────────────────────────────
  { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/',                                                                category: 'digital-business', priority: 1 },
  { name: 'VentureBeat',      url: 'https://venturebeat.com/feed/',                                                                                    category: 'digital-business', priority: 2 },
  { name: 'Fast Company Tech', url: 'https://www.fastcompany.com/technology/rss',                                                                      category: 'digital-business', priority: 2 },

  // ── NETWORKING & IT (3 feeds) ────────────────────────────────────────────
  { name: 'The Register',     url: 'https://www.theregister.com/headlines.atom',                                                                       category: 'networking-it', priority: 1 },
  { name: 'AWS Blog',         url: 'https://aws.amazon.com/blogs/aws/feed/',                                                                           category: 'networking-it', priority: 2 },
  { name: 'Cloudflare Blog',  url: 'https://blog.cloudflare.com/rss/',                                                                                 category: 'networking-it', priority: 2 },

  // ── REVIEWS (3 feeds) ────────────────────────────────────────────────────
  { name: 'PCMag Reviews',    url: 'https://www.pcmag.com/feeds/rss/reviews',                                                                          category: 'reviews', priority: 1 },
  { name: 'CNET Reviews',     url: 'https://www.cnet.com/rss/reviews/',                                                                                category: 'reviews', priority: 1 },
  { name: 'Wirecutter',       url: 'https://www.nytimes.com/wirecutter/feed/',                                                                         category: 'reviews', priority: 2 },

  // ── DESKTOPS (1 feed) ────────────────────────────────────────────────────
  { name: 'PCWorld',          url: 'https://www.pcworld.com/feed',                                                                                     category: 'desktops', priority: 1 },
]
