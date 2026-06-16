import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const supabase = createClient()
    const { data: apiKeySetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "openrouter_api_key")
      .single()

    const { data: modelSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "openrouter_model")
      .single()

    const apiKey = apiKeySetting?.value || process.env.OPENROUTER_API_KEY
    const model = modelSetting?.value || "mistralai/mixtral-8x7b-instruct"

    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 })
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://www.techpivo.com",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are an expert tech blogger for Techpivo. Write engaging, SEO-optimized content about technology. Always output valid HTML without markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("OpenRouter error:", data)
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 })
    }

    const content = data.choices?.[0]?.message?.content || ""

    return NextResponse.json({
      content,
      model: data.model,
      usage: data.usage,
    })
  } catch (error) {
    console.error("OpenRouter route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
