import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  reading_time: number;
  featured_image: string | null;
  category: { id: string; name: string; slug: string } | null;
  author: { id: string; full_name: string; username: string } | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  account_name: string;
  access_token: string;
  access_token_secret: string | null;
  custom_template: string | null;
  category_filter: string[] | null;
  total_posts_sent: number;
}

interface SocialPost {
  post_id: string;
  platform: string;
  account_id: string;
  status: "sent" | "failed";
  platform_post_id: string | null;
  error_message: string | null;
  content: string;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { postId } = await req.json() as { postId: string };
    if (!postId) {
      return new Response(JSON.stringify({ error: "postId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, title, slug, excerpt, content, reading_time, featured_image, category:category_id(id, name, slug), author:author_id(id, full_name, username)")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found", detail: postError }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const postData = post as unknown as Post;

    const { data: accounts, error: accountsError } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("auto_publish", true)
      .eq("is_active", true);

    if (accountsError) {
      return new Response(JSON.stringify({ error: "Failed to fetch social accounts", detail: accountsError }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const socialAccounts = accounts as SocialAccount[] | null;
    if (!socialAccounts || socialAccounts.length === 0) {
      return new Response(JSON.stringify({ message: "No active social accounts with auto_publish enabled", results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results: Array<{ platform: string; account: string; status: string; postId: string | null; error: string | null }> = [];

    for (const account of socialAccounts) {
      if (account.category_filter && account.category_filter.length > 0) {
        const catSlug = postData.category?.slug ?? "";
        if (!account.category_filter.includes(catSlug)) {
          continue;
        }
      }

      const link = `${SUPABASE_URL.replace("/functions/v1", "")}/post/${postData.slug}`;
      const utmLink = `${link}?utm_source=${account.platform}&utm_medium=social&utm_campaign=blizine-auto&utm_content=${postData.slug}`;

      const excerpt50 = postData.excerpt.length > 50
        ? postData.excerpt.substring(0, 47) + "..."
        : postData.excerpt;

      const excerpt100 = postData.excerpt.length > 100
        ? postData.excerpt.substring(0, 97) + "..."
        : postData.excerpt;

      const hashtags = postData.category?.name
        ? `#${postData.category.name.replace(/\s+/g, "")}`
        : "";

      const template = account.custom_template
        ?? "{title}\n\n{excerpt_100}\n\n{link}";

      let content = template
        .replace(/{title}/g, postData.title)
        .replace(/{excerpt_50}/g, excerpt50)
        .replace(/{excerpt_100}/g, excerpt100)
        .replace(/{link}/g, utmLink)
        .replace(/{hashtags}/g, hashtags)
        .replace(/{category}/g, postData.category?.name ?? "")
        .replace(/{author}/g, postData.author?.full_name ?? postData.author?.username ?? "")
        .replace(/{reading_time}/g, String(postData.reading_time));

      let platformPostId: string | null = null;
      let errorMessage: string | null = null;
      let status: "sent" | "failed" = "failed";

      try {
        const result = await publishToPlatform(account.platform, content, account, postData);
        platformPostId = result.platformPostId;
        status = "sent";
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[social-publisher] ${account.platform}/${account.account_name}: ${errorMessage}`);
      }

      const { error: insertError } = await supabase
        .from("social_posts")
        .insert({
          post_id: postData.id,
          platform: account.platform,
          account_id: account.id,
          status,
          platform_post_id: platformPostId,
          error_message: errorMessage,
          content,
        } as SocialPost);

      if (insertError) {
        console.error(`[social-publisher] Failed to insert social_post record:`, insertError);
      }

      if (status === "sent") {
        await supabase
          .from("social_accounts")
          .update({
            total_posts_sent: account.total_posts_sent + 1,
            last_posted_at: new Date().toISOString(),
          })
          .eq("id", account.id);
      }

      results.push({
        platform: account.platform,
        account: account.account_name,
        status,
        postId: platformPostId,
        error: errorMessage,
      });
    }

    return new Response(JSON.stringify({ postId, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[social-publisher] Unexpected error:", message);
    return new Response(JSON.stringify({ error: "Internal server error", detail: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function publishToPlatform(
  platform: string,
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  switch (platform) {
    case "twitter":
      return publishTwitter(content, account, post);
    case "facebook":
      return publishFacebook(content, account, post);
    case "linkedin":
      return publishLinkedIn(content, account, post);
    case "telegram":
      return publishTelegram(content, account, post);
    case "reddit":
      return publishReddit(content, account, post);
    case "medium":
      return publishMedium(content, account, post);
    case "devto":
      return publishDevTo(content, account, post);
    case "hashnode":
      return publishHashnode(content, account, post);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

async function publishTwitter(
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  console.log(`[Twitter] Posting to ${account.account_name}: ${content.substring(0, 100)}...`);
  const url = "https://api.twitter.com/2/tweets";
  const body = { text: content.length > 280 ? content.substring(0, 277) + "..." : content };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twitter API error (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { platformPostId: data.data?.id ?? null };
}

async function publishFacebook(
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  console.log(`[Facebook] Posting to ${account.account_name}: ${content.substring(0, 100)}...`);
  const pageId = account.account_name;
  const url = `https://graph.facebook.com/v18.0/${pageId}/feed`;
  const params = new URLSearchParams({
    message: content,
    access_token: account.access_token,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Facebook API error (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { platformPostId: data.id ?? null };
}

async function publishLinkedIn(
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  console.log(`[LinkedIn] Posting to ${account.account_name}: ${content.substring(0, 100)}...`);
  const urn = `urn:li:person:${account.account_name}`;
  const url = "https://api.linkedin.com/v2/ugcPosts";
  const body = {
    author: urn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`LinkedIn API error (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { platformPostId: data.id ?? null };
}

async function publishTelegram(
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  console.log(`[Telegram] Posting to ${account.account_name}: ${content.substring(0, 100)}...`);
  const chatId = account.account_name;
  const url = `https://api.telegram.org/bot${account.access_token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: content,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Telegram API error (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { platformPostId: data.result?.message_id != null ? String(data.result.message_id) : null };
}

async function publishReddit(
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  console.log(`[Reddit] Posting to ${account.account_name}: ${content.substring(0, 100)}...`);
  const [subreddit, titleLine] = content.split("\n", 2);
  const cleanSub = subreddit.replace(/^r\//, "");
  const title = titleLine ?? post.title;
  const url = "https://oauth.reddit.com/api/submit";
  const body = new URLSearchParams({
    sr: cleanSub,
    title,
    kind: "self",
    text: content,
    resubmit: "true",
    api_type: "json",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "User-Agent": "blizine-social-publisher/1.0",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Reddit API error (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { platformPostId: data.json?.data?.id ?? null };
}

async function publishMedium(
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  console.log(`[Medium] Posting to ${account.account_name}: ${content.substring(0, 100)}...`);
  const authorId = account.account_name;
  const url = `https://api.medium.com/v1/users/${authorId}/posts`;
  const body = {
    title: post.title,
    contentFormat: "markdown",
    content: `# ${post.title}\n\n${content}`,
    publishStatus: "draft",
    tags: post.category?.name ? [post.category.name] : [],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Medium API error (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { platformPostId: data.data?.id ?? null };
}

async function publishDevTo(
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  console.log(`[Dev.to] Posting to ${account.account_name}: ${content.substring(0, 100)}...`);
  const url = "https://dev.to/api/articles";
  const body = {
    article: {
      title: post.title,
      body_markdown: content,
      published: false,
      tags: post.category?.name?.toLowerCase().replace(/\s+/g, "") ?? [],
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": account.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Dev.to API error (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { platformPostId: data.id != null ? String(data.id) : null };
}

async function publishHashnode(
  content: string,
  account: SocialAccount,
  post: Post,
): Promise<{ platformPostId: string | null }> {
  console.log(`[Hashnode] Posting to ${account.account_name}: ${content.substring(0, 100)}...`);
  const [publicationId] = account.access_token_secret?.split(":") ?? [""];
  const url = "https://api.hashnode.com/graphql";
  const query = `
    mutation PublishPost($input: CreateStoryInput!) {
      createStory(input: $input) {
        post {
          _id
          slug
        }
      }
    }
  `;
  const variables = {
    input: {
      publicationId,
      title: post.title,
      contentMarkdown: content,
      isRepublished: false,
      tags: [],
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: account.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Hashnode API error (${res.status}): ${errBody}`);
  }
  const data = await res.json();
  return { platformPostId: data.data?.createStory?.post?.slug ?? null };
}
