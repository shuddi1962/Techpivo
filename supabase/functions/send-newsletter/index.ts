import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "npm:resend";

interface Post {
  id: string;
  title: string;
  excerpt: string;
  featured_image: string;
  category_id: string;
  slug: string;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  categories: string[];
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { postId } = await req.json();

    if (!postId) {
      return new Response(JSON.stringify({ error: "postId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const resend = new Resend(resendApiKey);

    const fromEmail = Deno.env.get("NEWSLETTER_FROM_EMAIL") || "newsletter@blizine.com";
    const siteUrl = Deno.env.get("SITE_URL") || "https://blizine.com";

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, title, excerpt, featured_image, category_id, slug")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const postData = post as Post;

    const { data: subscribers, error: subError } = await supabase
      .from("subscribers")
      .select("id, email, name, categories")
      .eq("status", "active");

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No active subscribers" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const postUrl = `${siteUrl}/post/${postData.slug}`;
    const postLink = postData.slug
      ? postUrl
      : `${siteUrl}/post/${postData.id}`;

    const eligibleSubscribers = (subscribers as Subscriber[]).filter((sub) => {
      if (!sub.categories || sub.categories.length === 0) return true;
      return sub.categories.includes(postData.category_id);
    });

    if (eligibleSubscribers.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No eligible subscribers for this category" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const subscriber of eligibleSubscribers) {
      const unsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
      const personalGreeting = subscriber.name
        ? `Hi ${subscriber.name},`
        : "Hi there,";

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Blizine</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your daily dose of tech &amp; innovation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">${personalGreeting}</p>
              <h2 style="margin:0 0 16px;font-size:24px;color:#111827;line-height:1.3;font-weight:700;">
                <a href="${postLink}" style="color:#111827;text-decoration:none;">${postData.title}</a>
              </h2>
              ${postData.excerpt ? `<p style="margin:0 0 24px;font-size:16px;color:#6b7280;line-height:1.6;">${postData.excerpt}</p>` : ""}
              ${postData.featured_image ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <img src="${postData.featured_image}" alt="${postData.title}" style="width:100%;max-width:100%;height:auto;border-radius:8px;display:block;" />
                  </td>
                </tr>
              </table>` : ""}
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;">
                    <a href="${postLink}" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Read More</a>
                  </td>
                </tr>
              </table>
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;padding-top:24px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      You received this email because you subscribed to Blizine newsletter.
                      <br>
                      <a href="${unsubscribeUrl}" style="color:#6366f1;text-decoration:underline;">Unsubscribe</a> at any time.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      try {
        await resend.emails.send({
          from: fromEmail,
          to: subscriber.email,
          subject: postData.title,
          html: htmlContent,
        });
        sentCount++;
      } catch (e) {
        errors.push(`Failed to send to ${subscriber.email}: ${e.message}`);
      }
    }

    const { error: trackError } = await supabase
      .from("newsletter_sends")
      .insert({
        post_id: postId,
        subject: postData.title,
        sent_count: sentCount,
      });

    if (trackError) {
      errors.push(`Failed to track send: ${trackError.message}`);
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Sent newsletter to ${sentCount} subscriber(s)`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
