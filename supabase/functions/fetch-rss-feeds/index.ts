import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";

interface RssFeed {
  id: string;
  url: string;
  source_name: string;
  source_slug: string;
  auto_rewrite: boolean;
  default_status: string;
  posts_fetched: number;
  last_fetched_at: string | null;
  last_error: string | null;
  active: boolean;
}

interface Post {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  original_source_url: string;
  source_name: string;
  source_slug: string;
  status: string;
  reading_time: number;
  created_at: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openRouterKey = Deno.env.get("OPENROUTER_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);
const parser = new Parser();

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200) || `post-${Date.now()}`;
}

function calculateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function extractExcerpt(html: string, maxLength = 300): string {
  const text = html.replace(/<[^>]*>/g, "").trim();
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

function extractFeaturedImage(item: any): string | null {
  if (item["media:content"]?.$?.url) return item["media:content"].$.url;
  if (item.enclosure?.url) return item.enclosure.url;
  if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;
  return null;
}

async function rewriteWithOpenRouter(
  title: string,
  content: string
): Promise<string> {
  const prompt = `Rewrite the following tech article in an engaging, SEO-optimized style for the blog Blizine. Keep facts accurate. Add a compelling intro, structured H2/H3 subheadings, and a conclusion. Output HTML only, no markdown. Article title: ${title}. Original content: ${content}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openRouterKey}`,
    },
    body: JSON.stringify({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || content;
}

async function processFeed(feed: RssFeed): Promise<void> {
  try {
    const parsed = await parser.parseURL(feed.url);

    if (!parsed.items?.length) return;

    const feedItemUrls = parsed.items
      .map((item) => item.link || item.guid)
      .filter(Boolean) as string[];

    const { data: existingPosts } = await supabase
      .from("posts")
      .select("original_source_url")
      .in("original_source_url", feedItemUrls);

    const existingUrls = new Set(
      (existingPosts || []).map((p) => p.original_source_url)
    );

    const newItems = parsed.items.filter(
      (item) => !existingUrls.has(item.link || item.guid)
    );

    if (!newItems.length) {
      await supabase
        .from("rss_feeds")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("id", feed.id);
      return;
    }

    for (const item of newItems) {
      const title = item.title || "Untitled";
      const content = item.content || item.contentSnippet || "";
      const featuredImage = extractFeaturedImage(item);
      let finalContent = content;

      if (feed.auto_rewrite && content.length > 50) {
        try {
          finalContent = await rewriteWithOpenRouter(title, content);
        } catch (err: any) {
          console.error(
            `[${feed.source_name}] Rewrite failed for "${title}": ${err.message}`
          );
        }
      }

      const slug = generateSlug(title);

      const post: Post = {
        title,
        slug,
        content: finalContent,
        excerpt: extractExcerpt(finalContent),
        featured_image: featuredImage,
        original_source_url: item.link || item.guid || "",
        source_name: feed.source_name,
        source_slug: feed.source_slug,
        status: feed.default_status,
        reading_time: calculateReadingTime(finalContent),
        created_at: item.isoDate
          ? new Date(item.isoDate).toISOString()
          : new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("posts")
        .insert(post);

      if (insertError) {
        console.error(
          `[${feed.source_name}] Insert failed for "${title}": ${insertError.message}`
        );
        continue;
      }

      await supabase.rpc("increment_feed_posts_count", {
        feed_id: feed.id,
      });
    }

    await supabase
      .from("rss_feeds")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", feed.id);
  } catch (err: any) {
    const errorMessage = err.message || "Unknown error";

    await supabase
      .from("rss_feeds")
      .update({
        last_error: errorMessage,
        last_fetched_at: new Date().toISOString(),
      })
      .eq("id", feed.id);

    console.error(`[${feed.source_name}] Feed error: ${errorMessage}`);
  }
}

Deno.serve(async (req) => {
  try {
    const { data: feeds, error: fetchError } = await supabase
      .from("rss_feeds")
      .select("*")
      .eq("active", true);

    if (fetchError) {
      throw new Error(`Failed to fetch feeds: ${fetchError.message}`);
    }

    if (!feeds?.length) {
      return new Response(JSON.stringify({ message: "No active feeds" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    await Promise.all(feeds.map((feed: RssFeed) => processFeed(feed)));

    return new Response(
      JSON.stringify({ message: `Processed ${feeds.length} feeds` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error(`Fatal error: ${err.message}`);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
