# Step 1 — Fix the RSS feed so it carries images & deduplicates

The auto-poster skips articles without an image because social platforms
require a media attachment. The current RSS feed also had duplicate items
(3-5 variants of the same story from two independent ingestion pipelines).

## Fix 1 — Add image data to each item

Edit `src/app/rss.xml/route.ts`:

1. Add the `featured_image` field to the Supabase query:

```diff
  const { data: posts } = await supabase
    .from("posts")
-   .select("title, slug, excerpt, content, published_at, ...")
+   .select("title, slug, excerpt, content, featured_image, published_at, ...")
```

2. Add `<media:content>` + `<enclosure>` inside each `<item>`, and declare
   the namespace on the `<rss>` tag:

```diff
+ xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:atom="http://www.w3.org/2005/Atom"
```

```diff
    <guid>${siteUrl}/${post.slug}</guid>
+   <media:content url="${post.featured_image}" medium="image" type="image/jpeg" />
+   <enclosure url="${post.featured_image}" type="image/jpeg" length="0" />
    <description><![CDATA[${post.excerpt || ""}]]></description>
```

## Fix 2 — De-duplicate items before rendering

Before mapping posts to RSS items, filter by normalized title hash:

```ts
const seen = new Set<string>()
const deduped = (posts || []).filter(p => {
  const norm = p.title?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80) || ""
  if (seen.has(norm)) return false
  seen.add(norm)
  return true
})
```

## Fix 3 — Stop duplicates at the pipeline level (root cause)

The duplication happens because **two RSS ingestion pipelines** run independently:

| Pipeline | Sets | Dedup checks |
|----------|------|-------------|
| `fetch-rss-feeds` (edge fn) | `original_source_url` | `original_source_url` + title |
| `/api/ingest` (Vercel) | `source_url` | `source_url` + fingerprint + title |

Each pipeline can't see the other's posts because they use different columns.

**Patches applied:**

1. **`supabase/functions/fetch-rss-feeds/index.ts`** — insert now also sets
   `source_url` and `source_urls`; dedup check also queries `source_url`.

2. **`src/app/api/ingest/route.ts`** — dedup query uses `.or()` on both
   `source_url` and `original_source_url`; dedup loop also checks
   `original_source_url`.

3. **`src/app/api/deduplicate/route.ts`** — cleanup endpoint now groups by
   whichever URL column is populated (`original_source_url || source_url`).

## Verify

```bash
# Check images are present
curl -s https://techpivo.com/rss.xml | grep -o '<enclosure[^>]*>' | head -3

# Check duplicates are gone — run this, count results for a topic
curl -s https://techpivo.com/rss.xml | grep -o 'NetNut' | wc -l
# Should be 1, not 5+
```
