import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://techpivo.com";

const SUBREDDIT_MAP: Record<string, string> = {
  "tech-news": "technology",
  "ai-automation": "artificial",
  "cybersecurity": "cybersecurity",
  "gadgets": "gadgets",
  "programming": "programming",
  "web-development": "webdev",
  "tutorials": "learnprogramming",
  "digital-business": "startups",
  "networking-it": "sysadmin",
  "reviews": "gadgets",
  "desktops": "buildapc",
};

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function buildUtmLink(url: string, platform: string, slug: string): string {
  return `${url}?utm_source=${platform}&utm_medium=social&utm_campaign=techpivo-auto&utm_content=${slug}`;
}

serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find scheduled posts that are due
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from("social_posts")
      .select("*, social_accounts!inner(*)")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(20);

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Failed to fetch scheduled posts", detail: fetchError }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(JSON.stringify({ message: "No scheduled posts due", processed: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; platform: string; status: string; error: string | null }> = [];

    for (const sp of scheduledPosts as any[]) {
      // Fetch the actual post
      const { data: post } = await supabase
        .from("posts")
        .select("id, title, slug, excerpt, content, featured_image, tags, category_id")
        .eq("id", sp.post_id)
        .single();

      if (!post) {
        await supabase
          .from("social_posts")
          .update({ status: "failed", error_message: "Post not found" })
          .eq("id", sp.id);
        results.push({ id: sp.id, platform: sp.platform, status: "failed", error: "Post not found" });
        continue;
      }

      // Get category slug
      const { data: cat } = await supabase
        .from("categories")
        .select("slug")
        .eq("id", post.category_id)
        .single();

      const categorySlug = cat?.slug || "tech-news";
      const postUrl = `${SITE}/${post.slug}`;
      const account = sp.social_accounts;

      // Check credentials
      const creds = account.credentials || {};
      const hasCreds = Object.values(creds).some((v) => v && String(v).trim());
      if (!hasCreds) {
        await supabase
          .from("social_posts")
          .update({ status: "failed", error_message: "No credentials configured" })
          .eq("id", sp.id);
        results.push({ id: sp.id, platform: sp.platform, status: "failed", error: "No credentials" });
        continue;
      }

      // Build content
      const utmLink = buildUtmLink(postUrl, sp.platform, post.slug);
      const excerpt = post.excerpt || "";
      const excerpt50 = excerpt.length > 50 ? excerpt.substring(0, 47) + "..." : excerpt;
      const excerpt100 = excerpt.length > 100 ? excerpt.substring(0, 97) + "..." : excerpt;
      const hashtags = (post.tags || []).slice(0, 3).map((t: string) => "#" + t.replace(/\s+/g, "")).join(" ");

      const template = account.custom_template || "{title}\n\n{excerpt_100}\n\n{link}";
      const content = renderTemplate(template, {
        title: post.title,
        excerpt_50,
        excerpt100,
        link: utmLink,
        hashtags,
        category: categorySlug.replace(/-/g, " "),
        author: "Techpivo",
        reading_time: "3 min",
      });

      let platformPostId: string | null = null;
      let status: "sent" | "failed" = "failed";
      let errorMessage: string | null = null;

      try {
        switch (account.platform) {
          case "twitter": {
            const res = await fetch("https://api.twitter.com/2/tweets", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${creds.access_token}`,
              },
              body: JSON.stringify({
                text: content.length > 280 ? content.substring(0, 277) + "..." : content,
              }),
            });
            if (!res.ok) throw new Error(`Twitter API error (${res.status})`);
            const data = await res.json();
            platformPostId = data.data?.id ?? null;
            break;
          }
          case "facebook": {
            const pageId = creds.page_id;
            const res = await fetch(
              `https://graph.facebook.com/v19.0/${pageId}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  message: content,
                  access_token: creds.page_access_token,
                }).toString(),
              }
            );
            if (!res.ok) throw new Error(`Facebook API error (${res.status})`);
            const data = await res.json();
            platformPostId = data.id ?? null;
            break;
          }
          case "linkedin": {
            const urn = creds.linkedin_page_urn || creds.page_urn || "";
            const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${creds.access_token}`,
                "X-Restli-Protocol-Version": "2.0.0",
              },
              body: JSON.stringify({
                author: urn ? `urn:li:organization:${urn}` : "",
                lifecycleState: "PUBLISHED",
                specificContent: {
                  "com.linkedin.ugc.ShareContent": {
                    shareCommentary: { text: content },
                    shareMediaCategory: "NONE",
                  },
                },
                visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
              }),
            });
            if (!res.ok) throw new Error(`LinkedIn API error (${res.status})`);
            const data = await res.json();
            platformPostId = data.id ?? null;
            break;
          }
          case "telegram": {
            const res = await fetch(
              `https://api.telegram.org/bot${creds.bot_token}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: creds.chat_id,
                  text: content,
                  parse_mode: "HTML",
                  disable_web_page_preview: false,
                }),
              }
            );
            if (!res.ok) throw new Error(`Telegram API error (${res.status})`);
            platformPostId = "sent";
            break;
          }
          case "reddit": {
            const subreddit = SUBREDDIT_MAP[categorySlug] || "technology";
            const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${creds.client_id}:${creds.client_secret}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Techpivo/1.0",
              },
              body: `grant_type=refresh_token&refresh_token=${creds.refresh_token}`,
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) throw new Error("Reddit token failed");
            const lines = content.split("\n");
            const title = lines[0]?.substring(0, 300) || post.title;
            const postLink = lines.find((l: string) => l.startsWith("http")) || postUrl;
            const res = await fetch("https://oauth.reddit.com/api/submit", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                "User-Agent": "Techpivo/1.0",
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                sr: subreddit,
                title,
                kind: "link",
                url: postLink,
                resubmit: "true",
                api_type: "json",
              }).toString(),
            });
            if (!res.ok) throw new Error(`Reddit API error (${res.status})`);
            platformPostId = "sent";
            break;
          }
          case "medium": {
            const userRes = await fetch("https://api.medium.com/v1/me", {
              headers: { Authorization: `Bearer ${creds.integration_token}` },
            });
            const { data: user } = await userRes.json();
            if (!user?.id) throw new Error("Medium user not found");
            const res = await fetch(`https://api.medium.com/v1/users/${user.id}/posts`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${creds.integration_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: post.title,
                contentFormat: "html",
                content,
                canonicalUrl: postUrl,
                tags: (post.tags || []).slice(0, 5),
                publishStatus: "public",
              }),
            });
            if (!res.ok) throw new Error(`Medium API error (${res.status})`);
            platformPostId = "sent";
            break;
          }
          case "devto": {
            const res = await fetch("https://dev.to/api/articles", {
              method: "POST",
              headers: { "api-key": creds.api_key, "Content-Type": "application/json" },
              body: JSON.stringify({
                article: {
                  title: post.title,
                  body_markdown: content.replace(/<[^>]+>/g, ""),
                  published: true,
                  tags: (post.tags || []).slice(0, 4).map((t: string) => t.toLowerCase().replace(/\s+/g, "")),
                },
              }),
            });
            if (!res.ok) throw new Error(`Dev.to API error (${res.status})`);
            platformPostId = "sent";
            break;
          }
          case "hashnode": {
            const res = await fetch("https://gql.hashnode.com", {
              method: "POST",
              headers: {
                Authorization: creds.personal_access_token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: `mutation PublishPost($input: PublishPostInput!) {
                  publishPost(input: $input) { post { id url } }
                }`,
                variables: {
                  input: {
                    title: post.title,
                    contentMarkdown: content.replace(/<[^>]+>/g, ""),
                    tags: (post.tags || []).slice(0, 5).map((t: string) => ({
                      name: t,
                      slug: t.toLowerCase().replace(/\s+/g, "-"),
                    })),
                    originalArticleURL: postUrl,
                  },
                },
              }),
            });
            if (!res.ok) throw new Error(`Hashnode API error (${res.status})`);
            platformPostId = "sent";
            break;
          }
          default:
            status = "skipped";
            break;
        }

        if (status !== "skipped") status = "sent";
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[process-social-posts] ${account.platform}: ${errorMessage}`);
      }

      // Update the social_posts record
      await supabase
        .from("social_posts")
        .update({
          status,
          sent_at: status === "sent" ? new Date().toISOString() : null,
          platform_post_id: platformPostId,
          content_preview: content.substring(0, 300),
          error_message: errorMessage,
        })
        .eq("id", sp.id);

      // Update account stats
      if (status === "sent") {
        await supabase
          .from("social_accounts")
          .update({
            total_posts_sent: (account.total_posts_sent || 0) + 1,
            last_posted_at: new Date().toISOString(),
          })
          .eq("id", account.id);
      }

      results.push({ id: sp.id, platform: sp.platform, status, error: errorMessage });
    }

    return new Response(
      JSON.stringify({ ok: true, processed: results.length, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[process-social-posts] Unexpected error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
