"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Zap, RefreshCw, FileText, Search, Image, Share2, CheckCircle, Copy, ExternalLink, Loader2 } from "lucide-react"

function GenerateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTopic = searchParams.get("topic") || ""
  const initialCategory = searchParams.get("category") || ""

  const [topic, setTopic] = useState(initialTopic)
  const [category, setCategory] = useState(initialCategory)
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<"outline" | "seo" | "social" | "images">("outline")

  const generatePlan = useCallback(async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/admin/editorial-intelligence/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, category: category || "Technology" }),
      })
      if (!res.ok) throw new Error("Generation failed")
      const data = await res.json()
      setPlan(data.plan)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [topic, category])

  useEffect(() => {
    if (initialTopic) generatePlan()
  }, [initialTopic, generatePlan])

  const saveAsDraft = async () => {
    if (!plan) return
    setSaving("draft")
    try {
      const supabase = createClient()
      const { error } = await supabase.from("posts").insert({
        title: plan.title,
        content: JSON.stringify(plan.outline),
        category_id: plan.suggested_category,
        status: "draft",
        tags: plan.tags,
        seo_title: plan.seo_title,
        meta_description: plan.meta_description,
        slug: plan.slug,
      })
      if (!error) {
        router.push("/admin/posts")
      }
    } catch (e) {
      console.error(e)
    }
    setSaving(null)
  }

  const approveAndPublish = async () => {
    if (!plan) return
    setSaving("publish")
    try {
      const supabase = createClient()
      const { error } = await supabase.from("posts").insert({
        title: plan.title,
        content: JSON.stringify(plan.outline),
        category_id: plan.suggested_category,
        status: "published",
        tags: plan.tags,
        seo_title: plan.seo_title,
        meta_description: plan.meta_description,
        slug: plan.slug,
      })
      if (!error) {
        router.push("/admin/posts")
      }
    } catch (e) {
      console.error(e)
    }
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/editorial-intelligence" className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Article Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">One-click pipeline: Research → SEO → Images → Social → Schedule</p>
        </div>
      </div>

      <div className="p-5 rounded-xl border bg-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Article topic (e.g., AI Agents)"
            className="px-4 py-3 rounded-lg border bg-background text-sm"
          />
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Category (e.g., AI & Automation)"
            className="px-4 py-3 rounded-lg border bg-background text-sm"
          />
          <button
            onClick={generatePlan}
            disabled={loading || !topic.trim()}
            className="px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Generate Everything
          </button>
        </div>
      </div>

      {plan && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl border bg-card">
            <h2 className="font-bold text-lg mb-1">{plan.title}</h2>
            <p className="text-sm text-muted-foreground mb-3">{plan.meta_description}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">{plan.suggested_category}</span>
              <span className="px-2 py-1 rounded bg-muted text-muted-foreground">{plan.reading_time}</span>
              <span className="px-2 py-1 rounded bg-muted text-muted-foreground">Schema: {plan.schema_type}</span>
              <span className="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30">Category Confidence: {plan.category_confidence}%</span>
            </div>
          </div>

          <div className="flex gap-1 border-b overflow-x-auto">
            {[
              { id: "outline" as const, label: "Outline", icon: FileText },
              { id: "seo" as const, label: "SEO & Keywords", icon: Search },
              { id: "images" as const, label: "Images", icon: Image },
              { id: "social" as const, label: "Social Posts", icon: Share2 },
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeSection === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeSection === "outline" && (
            <div className="space-y-4">
              {plan.outline?.map((section: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border bg-card">
                  <h3 className="font-semibold text-sm mb-2">{i + 1}. {section.heading}</h3>
                  <ul className="space-y-1 ml-4">
                    {section.points?.map((point: string, j: number) => (
                      <li key={j} className="text-sm text-muted-foreground list-disc">{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm mb-2">Frequently Asked Questions</h3>
                <div className="space-y-2">
                  {plan.faqs?.map((faq: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30">
                      <div className="text-sm font-medium">{faq.question}</div>
                      <div className="text-xs text-muted-foreground mt-1">{faq.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm mb-2">External References</h3>
                <div className="space-y-2">
                  {plan.external_references?.map((ref: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{ref.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30">{ref.authority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "seo" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm mb-2">SEO Metadata</h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">SEO Title</div>
                    <div className="text-sm font-medium">{plan.seo_title}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Slug</div>
                    <div className="text-sm font-mono">techpivo.com/{plan.slug}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Meta Description</div>
                    <div className="text-sm">{plan.meta_description}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm mb-2">Primary Keyword</h3>
                <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium text-sm">{plan.primary_keyword}</span>
              </div>
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm mb-2">Supporting Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {plan.supporting_keywords?.map((kw: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-muted text-sm">{kw}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm mb-2">Question Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {plan.question_keywords?.map((kw: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 text-sm">{kw}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {plan.tags?.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-muted text-sm">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "images" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm mb-3">Image Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.image_suggestions?.map((img: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{img.query}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          img.source === "Pexels" ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                          "bg-purple-100 text-purple-700 dark:bg-purple-900/30"
                        }`}>
                          {img.source}
                        </span>
                      </div>
                      <div className="h-32 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        {img.source === "Pexels" ? "Search Pexels API" : "AI Generate"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "social" && (
            <div className="space-y-4">
              {plan.social_drafts?.map((draft: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{draft.platform}</h3>
                    <button
                      onClick={() => { navigator.clipboard.writeText(draft.content); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="px-3 py-1 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-sm">{draft.content}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3 p-5">
            <button
              onClick={approveAndPublish}
              disabled={saving !== null}
              className="px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {saving === "publish" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve & Publish
            </button>
            <button
              onClick={saveAsDraft}
              disabled={saving !== null}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 flex items-center gap-2"
            >
              {saving === "draft" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Save as Draft
            </button>
            <button onClick={generatePlan} className="px-6 py-3 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </button>
           </div>
        </div>
      )}
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading generator...</p>
        </div>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  )
}
