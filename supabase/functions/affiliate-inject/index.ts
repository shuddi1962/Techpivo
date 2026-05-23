import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

interface Post {
  id: string;
  content: string;
  category_id: string;
  tags: string[];
}

interface AffiliateProgram {
  id: string;
}

interface AffiliateProduct {
  product_name: string;
  product_description: string;
  product_image_url: string;
  affiliate_link: string;
  sale_price: number | null;
  original_price: number | null;
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

    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, content, category_id, tags")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const postData = post as Post;

    const { data: programs, error: progError } = await supabase
      .from("affiliate_programs")
      .select("id")
      .eq("category_id", postData.category_id)
      .eq("auto_inject", true)
      .eq("is_active", true);

    if (progError) {
      return new Response(JSON.stringify({ error: progError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!programs || programs.length === 0) {
      return new Response(
        JSON.stringify({ injected: 0, message: "No matching affiliate programs found" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const programIds = programs.map((p: AffiliateProgram) => p.id);

    let productQuery = supabase
      .from("affiliate_products")
      .select("product_name, product_description, product_image_url, affiliate_link, sale_price, original_price")
      .in("affiliate_id", programIds)
      .eq("is_active", true)
      .order("conversions", { ascending: false })
      .limit(3);

    if (postData.tags && postData.tags.length > 0) {
      productQuery = productQuery.overlaps("tags", postData.tags);
    }

    const { data: products, error: prodError } = await productQuery;

    if (prodError) {
      return new Response(JSON.stringify({ error: prodError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ injected: 0, message: "No matching affiliate products found" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const productCards = (products as AffiliateProduct[]).map(
      (p) => `
    <div class="affiliate-card">
      <img src="${p.product_image_url || ""}" alt="${p.product_name}" loading="lazy" />
      <div class="affiliate-card-body">
        <h4>${p.product_name}</h4>
        <p>${p.product_description || ""}</p>
        <div class="affiliate-pricing">
          ${p.sale_price ? `<span class="sale-price">$${p.sale_price}</span>` : ""}
          ${p.original_price ? `<span class="original-price">$${p.original_price}</span>` : ""}
        </div>
        <a href="${p.affiliate_link}" rel="nofollow sponsored" target="_blank" class="affiliate-cta">Shop Now</a>
      </div>
    </div>`,
    );

    const affiliateHtml = `
<div class="affiliate-picks">
  <h3>Recommended for this article</h3>
  <div class="affiliate-grid">
    ${productCards.join("\n    ")}
  </div>
  <p class="affiliate-disclosure">This article contains affiliate links. We may earn a commission if you make a purchase through these links, at no extra cost to you.</p>
</div>`;

    const updatedContent = postData.content
      ? postData.content + "\n\n" + affiliateHtml
      : affiliateHtml;

    const { error: updateError } = await supabase
      .from("posts")
      .update({ content: updatedContent })
      .eq("id", postId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        injected: products.length,
        message: `Successfully injected ${products.length} affiliate product(s)`,
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
