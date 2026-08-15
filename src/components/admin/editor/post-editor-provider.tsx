"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { slugify } from "@/lib/utils"
import { calculateSeoScore, calculateReadability, generateSerpPreview } from "@/lib/seo-utils"
import type { EditorPostState, SerpPreview } from "@/types/editor"
import type { PostStatus } from "@/types/database"

interface PostEditorContextType {
  post: EditorPostState
  updatePost: (partial: Partial<EditorPostState>) => void
  setField: <K extends keyof EditorPostState>(key: K, value: EditorPostState[K]) => void
  seoScore: number
  seoKeyword: string
  setSeoKeyword: (kw: string) => void
  serpPreview: SerpPreview
  readability: { score: number; flesch: number }
  isSaving: boolean
  lastSaved: Date | null
  saveDraft: () => Promise<void>
  publish: () => Promise<void>
  schedule: (when: string) => Promise<void>
  uploadImage: (file: File) => Promise<string | null>
  categories: { id: string; name: string; slug: string }[]
  subcategories: { id: string; category_id: string; name: string; slug: string }[]
  loading: boolean
  dirty: boolean
}

const PostEditorContext = createContext<PostEditorContextType | null>(null)

const DRAFT_KEY = "techpivo-editor-draft"
const AUTO_SAVE_INTERVAL = 30000

const initialState: EditorPostState = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  featured_image: "",
  category_id: "",
  subcategory_id: "",
  author_id: "",
  tags: [],
  status: "draft",
  focus_keyword: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: [],
  seo_score: 0,
  canonical_url: "",
  robots_noindex: false,
  robots_nofollow: false,
  breadcrumb_title: "",
  og_title: "",
  og_description: "",
  og_image: "",
  twitter_title: "",
  twitter_description: "",
  twitter_image: "",
  schema_type: "Article",
  schema_data: null,
  post_format: "standard",
  is_sticky: false,
  enable_comments: true,
  readability_score: 0,
  flesch_score: 0,
  secondary_keywords: [],
  quick_brief: null,
  key_points: [],
  faq: null,
  quality_score: 0,
  is_featured: false,
  is_breaking: false,
  is_sponsored: false,
  series_id: "",
  reading_time: 1,
  published_at: null,
  scheduled_at: null,
  source_name: "",
  original_source_url: "",
  rss_source_url: "",
}

// Guard against malformed rows/drafts (null/string arrays etc.) that would
// crash panels doing .map() during render -> misleading full-page "500".
function normalizePost(raw: Record<string, unknown>): Record<string, unknown> {
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  const str = (v: unknown): string => (typeof v === "string" ? v : "")
  const num = (v: unknown, fallback = 0): number =>
    typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) || fallback : fallback
  const bool = (v: unknown, fallback = false): boolean =>
    typeof v === "boolean" ? v : typeof v === "string" ? v === "true" : fallback
  const out: Record<string, unknown> = { ...raw }
  out.tags = arr(raw.tags)
  out.seo_keywords = arr(raw.seo_keywords)
  out.secondary_keywords = arr(raw.secondary_keywords)
  out.key_points = Array.isArray(raw.key_points)
    ? (raw.key_points as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 6)
    : []
  out.faq = Array.isArray(raw.faq)
    ? (raw.faq as Array<Record<string, unknown>>)
        .filter((f) => f && typeof f === "object")
        .map((f) => ({ question: str(f.question), answer: str(f.answer) }))
        .filter((f) => f.question)
    : null
  out.title = str(raw.title)
  out.slug = str(raw.slug)
  out.content = str(raw.content)
  out.excerpt = str(raw.excerpt)
  out.featured_image = str(raw.featured_image)
  out.status = str(raw.status) || "draft"
  out.schema_type = str(raw.schema_type) || "Article"
  out.quality_score = num(raw.quality_score)
  out.seo_score = num(raw.seo_score)
  out.readability_score = num(raw.readability_score)
  out.flesch_score = num(raw.flesch_score)
  out.reading_time = num(raw.reading_time, 1)
  out.views = num(raw.views)
  out.robots_noindex = bool(raw.robots_noindex)
  out.robots_nofollow = bool(raw.robots_nofollow)
  out.is_sticky = bool(raw.is_sticky)
  out.enable_comments = bool(raw.enable_comments, true)
  out.is_featured = bool(raw.is_featured)
  out.is_breaking = bool(raw.is_breaking)
  out.is_sponsored = bool(raw.is_sponsored)
  out.ai_rewritten = bool(raw.ai_rewritten)
  out.google_indexed = bool(raw.google_indexed)
  return out
}

export function PostEditorProvider({
  children,
  initialPost,
}: {
  children: ReactNode
  initialPost?: Partial<EditorPostState> | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [post, setPost] = useState<EditorPostState>(
    () => ({ ...initialState, ...normalizePost((initialPost as Record<string, unknown>) || {}) }) as EditorPostState
  )
  const [seoKeyword, setSeoKeyword] = useState(initialPost?.focus_keyword || "")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([])
  const [subcategories, setSubcategories] = useState<{ id: string; category_id: string; name: string; slug: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const postRef = useRef(post)
  postRef.current = post

  // Fire-and-forget ISR revalidation so toggling publish/sticky state and
  // content edits reflect on the public article page + front page instantly.
  const revalidatePublic = useCallback((slug?: string) => {
    fetch("/api/admin/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slug || null }),
    }).catch((e) => console.warn("Revalidate failed:", e))
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: cats } = await supabase.from("categories").select("id, name, slug").order("name")
      if (cats) setCategories(cats)
      const { data: subcats } = await supabase.from("subcategories").select("id, category_id, name, slug")
      if (subcats) setSubcategories(subcats)

      if (!initialPost) {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed) setPost(prev => ({ ...prev, ...normalizePost(parsed) } as EditorPostState))
          } catch { /* ignore */ }
        }
      }
      setLoading(false)
    }
    load()
  }, [initialPost, supabase])

  useEffect(() => {
    if (!post.title && !post.content) return
    const seo = calculateSeoScore(seoKeyword, post)
    setPost(prev => (prev.seo_score === seo.score ? prev : { ...prev, seo_score: seo.score }))
  }, [post.title, post.content, post.slug, post.seo_title, post.seo_description, post.excerpt, post.featured_image, post.schema_type, seoKeyword])

  // Keep the SEO panel's keyword state in sync with external writes to
  // post.focus_keyword (AI write, draft restore). User typing stays in sync
  // because seo-panel writes through to post.focus_keyword too.
  const focusKeyword = post.focus_keyword
  useEffect(() => {
    if (focusKeyword && focusKeyword !== seoKeyword) {
      setSeoKeyword(focusKeyword)
    }
  }, [focusKeyword, seoKeyword])

  const updatePost = useCallback((partial: Partial<EditorPostState>) => {
    setPost(prev => ({ ...prev, ...partial }))
    setDirty(true)
  }, [])

  const setField = useCallback(<K extends keyof EditorPostState>(key: K, value: EditorPostState[K]) => {
    setPost(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  // Empty-string ids ("" is not a valid uuid) make every insert/update fail
  // with PostgREST "invalid input syntax for type uuid" — coerce to null.
  const cleanUuidFields = useCallback((p: EditorPostState) => {
    const c = { ...p }
    if (!c.category_id) c.category_id = null as unknown as string
    if (!c.subcategory_id) c.subcategory_id = null as unknown as string
    if (!c.series_id) c.series_id = null as unknown as string
    if (!c.author_id) c.author_id = null as unknown as string
    return c
  }, [])

  const ensureUniqueSlug = useCallback(async (supabase: ReturnType<typeof createClient>, base: string) => {
    const slug = base || slugify(postRef.current.title) || `post-${Date.now()}`
    let candidate = slug
    let i = 2
    for (;;) {
      const { data } = await supabase.from("posts").select("id").eq("slug", candidate).maybeSingle()
      if (!data) return candidate
      candidate = `${slug}-${i}`
      i += 1
      if (i > 20) return `${slug}-${Date.now()}` // give up on a weird conflict loop
    }
  }, [])

  const saveDraft = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setIsSaving(true)
    const { seo_score: _s, readability_score: _r, flesch_score: _f, ...clean } = cleanUuidFields(postRef.current)

    try {
      const readability = calculateReadability(postRef.current.content)
      const payload = {
        ...clean,
        author_id: user.id,
        focus_keyword: seoKeyword,
        seo_score: calculateSeoScore(seoKeyword, postRef.current).score,
        readability_score: readability.score,
        flesch_score: readability.flesch,
        reading_time: Math.max(1, Math.ceil((postRef.current.content.replace(/<[^>]*>/g, "").split(/\s+/).length || 1) / 200)),
        updated_at: new Date().toISOString(),
      }

      const now = new Date().toISOString()
      const publishPayload = { ...payload }
      if (publishPayload.status === "published" && !publishPayload.published_at) {
        publishPayload.published_at = now
      }

      if (postRef.current.id) {
        const { error } = await supabase.from("posts").update(publishPayload).eq("id", postRef.current.id)
        if (error) throw error
      } else {
        const insertPayload = { ...publishPayload, created_at: now }
        insertPayload.slug = insertPayload.slug || slugify(postRef.current.title) || `post-${Date.now()}`
        insertPayload.slug = await ensureUniqueSlug(supabase, insertPayload.slug)
        const { data, error } = await supabase.from("posts").insert(insertPayload).select("id").single()
        if (error) throw error
        if (data) {
          setPost(prev => ({ ...prev, id: data.id }))
        }
      }

      setLastSaved(new Date())
      setDirty(false)
      localStorage.removeItem(DRAFT_KEY)
      setPost(prev => (prev.focus_keyword === seoKeyword ? prev : { ...prev, focus_keyword: seoKeyword }))
      if (publishPayload.status === "published") {
        revalidatePublic(publishPayload.slug)
      }
    } catch (err) {
      console.error("Error saving draft:", err)
      localStorage.setItem(DRAFT_KEY, JSON.stringify(postRef.current))
      if (!silent) {
        alert("Failed to save draft. Your changes have been saved locally as a backup.")
        throw err
      }
    } finally {
      setIsSaving(false)
    }
  }, [seoKeyword, cleanUuidFields, ensureUniqueSlug, revalidatePublic])

  useEffect(() => {
    if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    if (!post.title && !post.content) return

    autoSaveTimer.current = setInterval(() => {
      if (postRef.current.id || (postRef.current.title || postRef.current.content)) {
        saveDraft({ silent: true })
      }
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [saveDraft, post.title, post.content])

  const publish = useCallback(async () => {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr) {
      console.error("Publish auth error:", authErr)
      alert("Authentication error. Please sign in again.")
      return
    }
    if (!user) {
      alert("You must be signed in to publish.")
      return
    }

    if (!post.title.trim()) {
      alert("A title is required before publishing.")
      return
    }

    const wordCount = post.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
    if (wordCount < 100) {
      alert("Content must be at least 100 words before publishing.")
      return
    }

    const seoResult = calculateSeoScore(seoKeyword, post)
    if (seoResult.score < 40) {
      const proceed = window.confirm(`SEO score is ${seoResult.score}/100. Are you sure you want to publish?`)
      if (!proceed) return
    }

    setIsSaving(true)

    try {
      const readability = calculateReadability(post.content)
      const now = new Date().toISOString()
      const finalSlug = post.id ? (post.slug || slugify(post.title)) : await ensureUniqueSlug(supabase, post.slug || slugify(post.title))

      const payload = {
        title: post.title,
        slug: finalSlug,
        content: post.content,
        excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, "").slice(0, 160),
        featured_image: post.featured_image,
        category_id: post.category_id || categories[0]?.id || null,
        subcategory_id: post.subcategory_id || null,
        author_id: user.id,
        status: "published" as PostStatus,
        tags: post.tags,
        published_at: now,
        reading_time: Math.max(1, Math.ceil(wordCount / 200)),
        seo_title: post.seo_title || post.title,
        seo_description: post.seo_description || post.excerpt || "",
        seo_keywords: seoKeyword ? [seoKeyword, ...post.secondary_keywords] : post.seo_keywords,
        seo_score: seoResult.score,
        focus_keyword: seoKeyword,
        canonical_url: post.canonical_url,
        robots_noindex: post.robots_noindex,
        robots_nofollow: post.robots_nofollow,
        breadcrumb_title: post.breadcrumb_title || post.title,
        og_title: post.og_title || post.seo_title || post.title,
        og_description: post.og_description || post.seo_description || post.excerpt || "",
        og_image: post.og_image || post.featured_image,
        twitter_title: post.twitter_title || post.og_title || post.seo_title || post.title,
        twitter_description: post.twitter_description || post.og_description || post.seo_description || post.excerpt || "",
        twitter_image: post.twitter_image || post.og_image || post.featured_image,
        schema_type: post.schema_type || "Article",
        schema_data: post.schema_data,
        post_format: post.post_format || "standard",
        is_sticky: post.is_sticky,
        is_featured: post.is_featured,
        is_breaking: post.is_breaking,
        is_sponsored: post.is_sponsored,
        enable_comments: post.enable_comments,
        readability_score: readability.score,
        flesch_score: readability.flesch,
        secondary_keywords: post.secondary_keywords,
        quick_brief: post.quick_brief,
        key_points: post.key_points,
        faq: post.faq,
        series_id: post.series_id || null,
        source_name: post.source_name,
        original_source_url: post.original_source_url,
        updated_at: now,
      }

      if (post.id) {
        const { error } = await supabase.from("posts").update(payload).eq("id", post.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("posts").insert(payload).select("id").single()
        if (error) throw error
        if (data) setPost(prev => ({ ...prev, id: data.id }))
      }

      // Fire-and-forget: enqueue for indexing + submit to IndexNow (Bing/Yandex/Seznam)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const postUrl = `${siteUrl}/${payload.slug}`
      void (async () => {
        const { error } = await supabase.from("google_indexing_queue").insert({ url: postUrl, status: "pending" })
        if (error) console.warn("Indexing queue insert failed:", error.message)
      })()
      fetch("/admin/indexing/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [postUrl] }),
      }).catch((e) => console.warn("IndexNow submit failed:", e))

      // Fire-and-forget: notify newsletter subscribers + push subscribers about the new article
      fetch("/api/publish/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: payload.slug }),
      }).catch((e) => console.warn("Publish notify failed:", e))

      setLastSaved(new Date())
      setDirty(false)
      localStorage.removeItem(DRAFT_KEY)
      revalidatePublic(payload.slug)
      router.push(`/admin/posts`)
    } catch (err) {
      console.error("Error publishing post:", err)
      alert("Failed to publish post. Check console for details.")
    } finally {
      setIsSaving(false)
    }
  }, [post, seoKeyword, categories, router, ensureUniqueSlug, revalidatePublic])

  const schedule = useCallback(async (when: string) => {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr) {
      console.error("Schedule auth error:", authErr)
      alert("Authentication error. Please sign in again.")
      return
    }
    if (!user) {
      alert("You must be signed in to schedule.")
      return
    }

    if (!post.title.trim()) {
      alert("A title is required before scheduling.")
      return
    }

    setIsSaving(true)

    try {
      const now = new Date().toISOString()
      const finalSlug = post.id ? (post.slug || slugify(post.title)) : await ensureUniqueSlug(supabase, post.slug || slugify(post.title)) || `post-${Date.now()}`
      const payload = {
        title: post.title,
        slug: finalSlug,
        content: post.content,
        excerpt: post.excerpt,
        featured_image: post.featured_image,
        category_id: post.category_id || null,
        subcategory_id: post.subcategory_id || null,
        author_id: user.id,
        status: "scheduled" as PostStatus,
        tags: post.tags,
        scheduled_at: when,
        reading_time: Math.max(1, Math.ceil((post.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length || 1) / 200)),
        seo_title: post.seo_title || post.title,
        seo_description: post.seo_description || post.excerpt || "",
        seo_keywords: seoKeyword ? [seoKeyword, ...post.secondary_keywords] : post.seo_keywords,
        seo_score: calculateSeoScore(seoKeyword, post).score,
        focus_keyword: seoKeyword,
        canonical_url: post.canonical_url,
        robots_noindex: post.robots_noindex,
        robots_nofollow: post.robots_nofollow,
        breadcrumb_title: post.breadcrumb_title || post.title,
        og_title: post.og_title || post.seo_title || post.title,
        og_description: post.og_description || post.seo_description || post.excerpt || "",
        og_image: post.og_image || post.featured_image,
        twitter_title: post.twitter_title || post.og_title || post.seo_title || post.title,
        twitter_description: post.twitter_description || post.og_description || post.seo_description || post.excerpt || "",
        twitter_image: post.twitter_image || post.og_image || post.featured_image,
        schema_type: post.schema_type || "Article",
        schema_data: post.schema_data,
        post_format: post.post_format || "standard",
        is_sticky: post.is_sticky,
        is_featured: post.is_featured,
        is_breaking: post.is_breaking,
        is_sponsored: post.is_sponsored,
        enable_comments: post.enable_comments,
        secondary_keywords: post.secondary_keywords,
        quick_brief: post.quick_brief,
        key_points: post.key_points,
        faq: post.faq,
        series_id: post.series_id || null,
        source_name: post.source_name,
        original_source_url: post.original_source_url,
        updated_at: now,
      }

      if (post.id) {
        const { error } = await supabase.from("posts").update(payload).eq("id", post.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("posts").insert(payload).select("id").single()
        if (error) throw error
        if (data) setPost(prev => ({ ...prev, id: data.id }))
      }
      setLastSaved(new Date())
      setDirty(false)
      router.push("/admin/posts")
    } catch (err) {
      console.error("Error scheduling post:", err)
      alert("Failed to schedule post. Check console for details.")
    } finally {
      setIsSaving(false)
    }
  }, [post, seoKeyword, router, ensureUniqueSlug])

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage.from("media").upload(fileName, file)
    if (error) {
      alert("Upload failed: " + error.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(fileName)
    // Track in the Media Library (best-effort)
    supabase.from("media_files").insert({
      name: file.name,
      path: fileName,
      url: publicUrl,
      mimetype: file.type || null,
      size: file.size,
    }).then(() => {}, () => {})
    return publicUrl
  }, [])

  const serpPreview = generateSerpPreview({ ...post, seo_title: post.seo_title || post.title })
  const readability = calculateReadability(post.content)

  return (
    <PostEditorContext.Provider
      value={{
        post,
        updatePost,
        setField,
        seoScore: post.seo_score,
        seoKeyword,
        setSeoKeyword: (kw: string) => { setSeoKeyword(kw); setDirty(true) },
        serpPreview,
        readability,
        isSaving,
        lastSaved,
        saveDraft,
        publish,
        schedule,
        uploadImage,
        categories,
        subcategories,
        loading,
        dirty,
      }}
    >
      {children}
    </PostEditorContext.Provider>
  )
}

export function usePostEditor() {
  const ctx = useContext(PostEditorContext)
  if (!ctx) throw new Error("usePostEditor must be used within PostEditorProvider")
  return ctx
}
