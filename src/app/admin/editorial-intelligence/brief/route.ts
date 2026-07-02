import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()
  const { topic, category, opportunity_score } = body

  const brief = {
    title: topic,
    working_title: `The Complete Guide to ${topic}`,
    seo_title: `${topic} — Everything You Need to Know in 2026 | TechPivo`,
    slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    meta_description: `Comprehensive guide to ${topic}. Learn about the latest features, comparisons, and expert insights. Updated ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.`,
    category: category || "Technology",
    search_intent: "informational",
    target_audience: "Technology enthusiasts and professionals",
    primary_keyword: topic.toLowerCase(),
    supporting_keywords: [
      `${topic} guide`,
      `${topic} features`,
      `${topic} review`,
      `${topic} vs alternatives`,
      `best ${topic.toLowerCase()} tools`,
    ],
    question_keywords: [
      `What is ${topic}?`,
      `How does ${topic} work?`,
      `Is ${topic} worth it?`,
      `Best alternatives to ${topic}`,
      `${topic} pros and cons`,
    ],
    suggested_headings: [
      `What is ${topic}?`,
      `Key Features and Capabilities`,
      `How ${topic} Works`,
      `Benefits and Advantages`,
      `Limitations and Drawbacks`,
      `${topic} vs Competitors`,
      `Pricing and Plans`,
      `Getting Started Guide`,
      `Best Practices`,
      `Frequently Asked Questions`,
      `Conclusion`,
    ],
    faqs: [
      { question: `What is ${topic}?`, answer: `${topic} is a technology solution that...` },
      { question: `How much does ${topic} cost?`, answer: `Pricing varies depending on the plan...` },
      { question: `Is ${topic} better than alternatives?`, answer: `${topic} offers unique advantages in...` },
      { question: `Who should use ${topic}?`, answer: `${topic} is ideal for...` },
      { question: `What are the best ${topic} alternatives?`, answer: `Top alternatives include...` },
    ],
    internal_links: [],
    external_references: [
      { title: `Official ${topic} Documentation`, url: "#", authority: "high" },
      { title: `${topic} GitHub Repository`, url: "#", authority: "high" },
    ],
    schema_type: "Article",
    estimated_reading_time: "12 min read",
    suggested_tags: [topic.toLowerCase(), "technology", "guide", "review", "2026"],
    suggested_category: category || "Technology",
    estimated_word_count: 2500,
    image_suggestions: [
      `${topic} hero image`,
      `${topic} interface screenshot`,
      `${topic} comparison chart`,
      `${topic} architecture diagram`,
    ],
    outline: [
      { heading: "Introduction", level: 1, key_points: ["Hook", "Context", "What readers will learn"] },
      { heading: "What is " + topic + "?", level: 2, key_points: ["Definition", "History", "Current state"] },
      { heading: "Key Features", level: 2, key_points: ["Feature 1", "Feature 2", "Feature 3"] },
      { heading: "How It Works", level: 2, key_points: ["Architecture", "Workflow", "Integration"] },
      { heading: "Benefits", level: 2, key_points: ["Performance", "Cost", "Scalability"] },
      { heading: "Comparison", level: 2, key_points: ["vs Alternative A", "vs Alternative B"] },
      { heading: "Getting Started", level: 2, key_points: ["Setup", "Configuration", "First steps"] },
      { heading: "FAQs", level: 2, key_points: ["Common questions"] },
      { heading: "Conclusion", level: 2, key_points: ["Summary", "Recommendation", "Next steps"] },
    ],
  }

  await supabase.from("content_briefs").insert({
    topic,
    category,
    brief_data: brief,
    opportunity_score: opportunity_score || 0,
    status: "generated",
  })

  return NextResponse.json({ brief })
}
