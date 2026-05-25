$supabaseUrl = "https://xkhvojjogoeuvrifekwr.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraHZvampvZ29ldXZyaWZla3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU1MjYzMywiZXhwIjoyMDk1MTI4NjMzfQ.06p7J_Gr9CW3nyGc1f0HGj8hXad5U8nJ9yt9XKC9aa8"
$headers = @{ "Authorization" = "Bearer $serviceKey"; "apikey" = $serviceKey; "Content-Type" = "application/json"; "Prefer" = "resolution=merge-duplicates" }

$now = (Get-Date).ToString("o")

$feeds = @(
  # Tech News (13 feeds)
  @{feed_name = "The Verge"; feed_url = "https://www.theverge.com/rss/index.xml"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "TechCrunch"; feed_url = "https://techcrunch.com/feed/"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "Engadget"; feed_url = "https://www.engadget.com/rss.xml"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "Gizmodo"; feed_url = "https://gizmodo.com/feed/rss"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "Ars Technica"; feed_url = "https://feeds.arstechnica.com/arstechnica/index"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "CNET"; feed_url = "https://www.cnet.com/rss/all/"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Wired"; feed_url = "https://www.wired.com/feed/rss"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = 'Tom''s Guide'; feed_url = "https://www.tomsguide.com/feeds/rss2/news.xml"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "TechRadar"; feed_url = "https://www.techradar.com/feeds/rss/news.xml"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "ZDNet"; feed_url = "https://www.zdnet.com/news/rss.xml"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Mashable Tech"; feed_url = "https://mashable.com/feeds/rss/tech.xml"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Digital Trends"; feed_url = "https://www.digitaltrends.com/feed/"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "MIT Tech Review"; feed_url = "https://www.technologyreview.com/stories.rss"; category_id = "fc85c0a2-f418-42b6-94c4-25b533a24250"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}

  # AI & Automation (6 feeds)
  @{feed_name = "VentureBeat AI"; feed_url = "https://venturebeat.com/category/ai/feed/"; category_id = "b5777693-9029-4921-81c4-191b47e8fef2"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "The Verge AI"; feed_url = "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"; category_id = "b5777693-9029-4921-81c4-191b47e8fef2"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "TechCrunch AI"; feed_url = "https://techcrunch.com/category/artificial-intelligence/feed/"; category_id = "b5777693-9029-4921-81c4-191b47e8fef2"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "Wired AI"; feed_url = "https://www.wired.com/feed/tag/artificial-intelligence/rss"; category_id = "b5777693-9029-4921-81c4-191b47e8fef2"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "MIT Tech Review AI"; feed_url = "https://www.technologyreview.com/topic/artificial-intelligence/feed/"; category_id = "b5777693-9029-4921-81c4-191b47e8fef2"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "Ars Technica AI"; feed_url = "https://feeds.arstechnica.com/arstechnica/ai"; category_id = "b5777693-9029-4921-81c4-191b47e8fef2"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}

  # Cybersecurity (6 feeds)
  @{feed_name = "BleepingComputer"; feed_url = "https://www.bleepingcomputer.com/feed/"; category_id = "d87c2b43-e16d-4e0a-9cab-5a8c5df43cf1"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "The Hacker News"; feed_url = "https://feeds.feedburner.com/TheHackersNews"; category_id = "d87c2b43-e16d-4e0a-9cab-5a8c5df43cf1"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "SecurityWeek"; feed_url = "https://www.securityweek.com/feed/"; category_id = "d87c2b43-e16d-4e0a-9cab-5a8c5df43cf1"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Krebs on Security"; feed_url = "https://krebsonsecurity.com/feed/"; category_id = "d87c2b43-e16d-4e0a-9cab-5a8c5df43cf1"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "Dark Reading"; feed_url = "https://www.darkreading.com/rss.xml"; category_id = "d87c2b43-e16d-4e0a-9cab-5a8c5df43cf1"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Threatpost"; feed_url = "https://threatpost.com/feed/"; category_id = "d87c2b43-e16d-4e0a-9cab-5a8c5df43cf1"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}

  # Gadgets (8 feeds)
  @{feed_name = "9to5Mac"; feed_url = "https://9to5mac.com/feed/"; category_id = "b817564b-55bb-455a-bbc1-caa4c72d5a61"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "MacRumors"; feed_url = "https://feeds.macrumors.com/MacRumors-All"; category_id = "b817564b-55bb-455a-bbc1-caa4c72d5a61"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "9to5Google"; feed_url = "https://9to5google.com/feed/"; category_id = "b817564b-55bb-455a-bbc1-caa4c72d5a61"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "Android Authority"; feed_url = "https://www.androidauthority.com/feed/"; category_id = "b817564b-55bb-455a-bbc1-caa4c72d5a61"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "PCMag"; feed_url = "https://www.pcmag.com/feeds/rss/software"; category_id = "b817564b-55bb-455a-bbc1-caa4c72d5a61"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "AppleInsider"; feed_url = "https://appleinsider.com/rss/news/"; category_id = "b817564b-55bb-455a-bbc1-caa4c72d5a61"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = 'Tom''s Hardware'; feed_url = "https://www.tomshardware.com/feeds/all"; category_id = "b817564b-55bb-455a-bbc1-caa4c72d5a61"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "GSMArena"; feed_url = "https://www.gsmarena.com/rss-news-reviews.php3"; category_id = "b817564b-55bb-455a-bbc1-caa4c72d5a61"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}

  # Programming (5 feeds)
  @{feed_name = "Dev.to"; feed_url = "https://dev.to/feed"; category_id = "eaaf42ef-06cd-4764-a703-76fa93a788ec"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "GitHub Blog"; feed_url = "https://github.blog/feed/"; category_id = "eaaf42ef-06cd-4764-a703-76fa93a788ec"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Stack Overflow Blog"; feed_url = "https://stackoverflow.blog/feed/"; category_id = "eaaf42ef-06cd-4764-a703-76fa93a788ec"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "Hacker News Best"; feed_url = "https://hnrss.org/best"; category_id = "eaaf42ef-06cd-4764-a703-76fa93a788ec"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "freeCodeCamp"; feed_url = "https://www.freecodecamp.org/news/rss/"; category_id = "eaaf42ef-06cd-4764-a703-76fa93a788ec"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}

  # Web Development (4 feeds)
  @{feed_name = "Smashing Magazine"; feed_url = "https://www.smashingmagazine.com/feed/"; category_id = "fc60a04d-4bf9-4ab5-afb7-2c6249873000"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "CSS-Tricks"; feed_url = "https://css-tricks.com/feed/"; category_id = "fc60a04d-4bf9-4ab5-afb7-2c6249873000"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "web.dev"; feed_url = "https://web.dev/feed.xml"; category_id = "fc60a04d-4bf9-4ab5-afb7-2c6249873000"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "Netlify Blog"; feed_url = "https://www.netlify.com/blog/index.xml"; category_id = "fc60a04d-4bf9-4ab5-afb7-2c6249873000"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}

  # Tutorials (3 feeds)
  @{feed_name = "DigitalOcean Tutorials"; feed_url = "https://www.digitalocean.com/community/tutorials/feed"; category_id = "9b2b9c2d-0ddb-4ff1-89a6-caf3c4a45f9b"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "MakeUseOf"; feed_url = "https://www.makeuseof.com/feed/"; category_id = "9b2b9c2d-0ddb-4ff1-89a6-caf3c4a45f9b"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "How-To Geek"; feed_url = "https://www.howtogeek.com/feed/"; category_id = "9b2b9c2d-0ddb-4ff1-89a6-caf3c4a45f9b"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}

  # Digital Business (4 feeds)
  @{feed_name = "TechCrunch Startups"; feed_url = "https://techcrunch.com/category/startups/feed/"; category_id = "355385b6-f33a-49ad-bd95-c14d98c33cca"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 30; created_at = $now}
  @{feed_name = "VentureBeat"; feed_url = "https://venturebeat.com/feed/"; category_id = "355385b6-f33a-49ad-bd95-c14d98c33cca"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Business Insider Tech"; feed_url = "https://feeds.businessinsider.com/businessinsider/tech"; category_id = "355385b6-f33a-49ad-bd95-c14d98c33cca"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Fast Company Tech"; feed_url = "https://www.fastcompany.com/technology/rss"; category_id = "355385b6-f33a-49ad-bd95-c14d98c33cca"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}

  # Networking & IT (4 feeds)
  @{feed_name = "Network World"; feed_url = "https://www.networkworld.com/index.rss"; category_id = "0d47e0c3-ba2b-46fb-a117-77c9330ce603"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "The Register"; feed_url = "https://www.theregister.com/headlines.atom"; category_id = "0d47e0c3-ba2b-46fb-a117-77c9330ce603"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "AWS Blog"; feed_url = "https://aws.amazon.com/blogs/aws/feed/"; category_id = "0d47e0c3-ba2b-46fb-a117-77c9330ce603"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "Google Cloud Blog"; feed_url = "https://cloud.google.com/feeds/gcp-news-rss.xml"; category_id = "0d47e0c3-ba2b-46fb-a117-77c9330ce603"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}

  # Reviews (5 feeds)
  @{feed_name = "PCMag Reviews"; feed_url = "https://www.pcmag.com/feeds/rss/reviews"; category_id = "792e438f-aedf-4f3d-9fcb-f216bdfc4293"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "CNET Reviews"; feed_url = "https://www.cnet.com/rss/reviews/"; category_id = "792e438f-aedf-4f3d-9fcb-f216bdfc4293"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
  @{feed_name = "Wirecutter"; feed_url = "https://www.nytimes.com/wirecutter/feed/"; category_id = "792e438f-aedf-4f3d-9fcb-f216bdfc4293"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "Rtings"; feed_url = "https://www.rtings.com/news/feed"; category_id = "792e438f-aedf-4f3d-9fcb-f216bdfc4293"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 120; created_at = $now}
  @{feed_name = "NotebookCheck"; feed_url = "https://www.notebookcheck.net/News.rss"; category_id = "792e438f-aedf-4f3d-9fcb-f216bdfc4293"; is_active = $true; auto_rewrite = $true; auto_publish = $true; fetch_interval_minutes = 60; created_at = $now}
)

$json = $feeds | ConvertTo-Json -Depth 10 -Compress
try {
  $r = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rss_feeds" -Method Post -Headers $headers -Body $json
  Write-Host "All $($feeds.Count) feeds seeded OK"
} catch {
  Write-Host "Error: $_"
}
