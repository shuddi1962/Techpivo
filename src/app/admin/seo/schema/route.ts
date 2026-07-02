import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { postId, schemaType, customData } = await request.json()

    // Get the post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(full_name, avatar_url)")
      .eq("id", postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get site settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["site_name", "site_url", "default_og_image"])

    const settingsMap = settings?.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}) || {}

    // Generate schema based on type
    let schema: any = {}

    switch (schemaType) {
      case "NewsArticle":
        schema = generateNewsArticleSchema(post, settingsMap, customData)
        break
      case "Article":
        schema = generateArticleSchema(post, settingsMap, customData)
        break
      case "FAQPage":
        schema = generateFAQSchema(post, customData)
        break
      case "HowTo":
        schema = generateHowToSchema(post, customData)
        break
      case "Review":
        schema = generateReviewSchema(post, customData)
        break
      case "BreadcrumbList":
        schema = generateBreadcrumbSchema(post, settingsMap)
        break
      default:
        schema = generateArticleSchema(post, settingsMap, customData)
    }

    return NextResponse.json({ success: true, schema })
  } catch (error: any) {
    console.error("Schema generation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateNewsArticleSchema(post: any, settings: any, customData: any = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": post.seo_title || post.title,
    "image": post.featured_image || post.og_image || settings.default_og_image,
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": {
      "@type": "Person",
      "name": post.profiles?.full_name || "TechPivo Editor",
      "url": `https://www.techpivo.com/author/${post.author_id}`
    },
    "publisher": {
      "@type": "Organization",
      "name": settings.site_name || "TechPivo",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.techpivo.com/icon.svg"
      }
    },
    "description": post.seo_description || post.excerpt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.techpivo.com/${post.slug}`
    },
    "keywords": post.seo_keywords?.join(", ") || "",
    "articleSection": post.category_id,
    ...customData
  }
}

function generateArticleSchema(post: any, settings: any, customData: any = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.seo_title || post.title,
    "image": post.featured_image || post.og_image,
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": {
      "@type": "Person",
      "name": post.profiles?.full_name || "TechPivo Editor"
    },
    "publisher": {
      "@type": "Organization",
      "name": settings.site_name || "TechPivo"
    },
    "description": post.seo_description || post.excerpt,
    "mainEntityOfPage": `https://www.techpivo.com/${post.slug}`,
    ...customData
  }
}

function generateFAQSchema(post: any, customData: any = {}) {
  const faqs = customData.faqs || []
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq: any) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }
}

function generateHowToSchema(post: any, customData: any = {}) {
  const steps = customData.steps || []
  
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": post.title,
    "description": post.seo_description || post.excerpt,
    "step": steps.map((step: any, index: number) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      "image": step.image || undefined
    })),
    ...customData
  }
}

function generateReviewSchema(post: any, customData: any = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "Product",
      "name": customData.productName || post.title,
      "image": post.featured_image,
      "description": post.excerpt
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": customData.rating || "4",
      "bestRating": "5"
    },
    "author": {
      "@type": "Person",
      "name": post.profiles?.full_name || "TechPivo Editor"
    },
    "reviewBody": customData.reviewBody || post.excerpt,
    "datePublished": post.published_at,
    ...customData
  }
}

function generateBreadcrumbSchema(post: any, settings: any) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": settings.site_url || "https://www.techpivo.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": post.category_id || "Articles",
        "item": `${settings.site_url || "https://www.techpivo.com"}/category/${post.category_id}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `${settings.site_url || "https://www.techpivo.com"}/${post.slug}`
      }
    ]
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")

    if (!postId) {
      // Return schema templates
      const { data: templates, error } = await supabase
        .from("schema_templates")
        .select("*")
        .order("name")

      if (error) throw error
      return NextResponse.json({ templates })
    }

    // Generate schema for specific post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Generate all applicable schemas
    const schemas = {
      article: generateArticleSchema(post, {}),
      breadcrumb: generateBreadcrumbSchema(post, {})
    }

    return NextResponse.json({ schemas })
  } catch (error: any) {
    console.error("Get schema error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
