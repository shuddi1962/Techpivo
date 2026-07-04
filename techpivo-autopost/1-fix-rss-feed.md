# Step 1 — Fix the RSS feed so it carries images

The auto-poster skips articles without an image because social platforms
require a media attachment for rich link previews. The current RSS feed at
`/rss.xml` does not include a `<media:content>` or `<enclosure>` element, so
we need to add one.

## What to change

Edit `src/app/rss.xml/route.ts`:

1. Add the `featured_image` field to the Supabase query:

```diff
  const { data: posts } = await supabase
    .from("posts")
-   .select("title, slug, excerpt, content, published_at, author:profiles(full_name), category:categories(name)")
+   .select("title, slug, excerpt, content, featured_image, published_at, author:profiles(full_name), category:categories(name)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50)
```

2. Add a `<media:content>` element inside each `<item>` and declare the
   namespace on the `<rss>` tag:

```diff
+ xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:atom="http://www.w3.org/2005/Atom"
```

```diff
    <guid>${siteUrl}/${post.slug}</guid>
+   <media:content url="${post.featured_image}" medium="image" type="image/jpeg" />
    <description><![CDATA[${post.excerpt || ""}]]></description>
```

3. Optionally add `<enclosure>` for backward compatibility with readers that
   don't support Media RSS:

```diff
+   <enclosure url="${post.featured_image}" type="image/jpeg" length="0" />
```

## Verify

After deploying, run:

```bash
curl -s https://techpivo.com/rss.xml | grep -o '<media:content[^>]*>' | head -3
```

You should see a URL returned for each item. Now the auto-poster will never
skip an article for lack of an image.

## Why this matters

- Facebook / Instagram / Threads / LinkedIn all generate link previews from
  Open Graph tags, but the auto-poster posts these articles by sending a
  message + link. Without an image in the feed, the poster has nothing to
  attach for platforms like X (where you can attach media to a tweet) or
  Instagram (where every post requires an image).

- The auto-poster filters `rss.items.filter(item => itemImage(item))` — no
  image, no post. Fixing the feed unblocks all platforms at once.
