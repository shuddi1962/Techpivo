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

const DRAFT_KEY = "blizine-editor-draft"
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
  blizine_score: 0,
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

export function PostEditorProvider({
  children,
  initialPost,
}: {
  children: ReactNode
  initialPost?: Partial<EditorPostState> | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [post, setPost] = useState<EditorPostState>({ ...initialState, ...initialPost })
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
            if (parsed) setPost(prev => ({ ...prev, ...parsed }))
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
    setPost(prev => ({ ...prev, seo_score: seo.score }))
  }, [post.title, post.content, post.slug, post.seo_title, post.seo_description, post.excerpt, post.featured_image, post.schema_type, seoKeyword])

  const updatePost = useCallback((partial: Partial<EditorPostState>) => {
    setPost(prev => ({ ...prev, ...partial }))
    setDirty(true)
  }, [])

  const setField = useCallback(<K extends keyof EditorPostState>(key: K, value: EditorPostState[K]) => {
    setPost(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  const saveDraft = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setIsSaving(true)
    const { seo_score: _s, readability_score: _r, flesch_score: _f, ...clean } = postRef.current

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

      if (postRef.current.id) {
        const { error } = await supabase.from("posts").update(payload).eq("id", postRef.current.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("posts").insert({ ...payload, created_at: new Date().toISOString() }).select("id").single()
        if (error) throw error
        if (data) {
          setPost(prev => ({ ...prev, id: data.id }))
        }
      }

      setLastSaved(new Date())
      setDirty(false)
      localStorage.removeItem(DRAFT_KEY)
    } catch (err) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(postRef.current))
      throw err
    }
    setIsSaving(false)
  }, [seoKeyword])

  useEffect(() => {
    if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    if (!post.title && !post.content) return

    autoSaveTimer.current = setInterval(() => {
      if (postRef.current.id || (postRef.current.title || postRef.current.content)) {
        saveDraft()
      }
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [saveDraft, post.title, post.content])

  const publish = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const wordCount = post.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
    if (wordCount < 100) {
      alert("Content must be at least 100 words before publishing.")
      return
    }

    setIsSaving(true)

    const readability = calculateReadability(post.content)
    const seoResult = calculateSeoScore(seoKeyword, post)
    const now = new Date().toISOString()

    const payload = {
      title: post.title,
      slug: post.slug || slugify(post.title),
      content: post.content,
      excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, "").slice(0, 160),
      featured_image: post.featured_image,
      category_id: post.category_id || categories[0]?.id,
      subcategory_id: post.subcategory_id,
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
      post_format: post.post_format || "standard",
      is_sticky: post.is_sticky,
      is_featured: post.is_featured,
      is_breaking: post.is_breaking,
      is_sponsored: post.is_sponsored,
      enable_comments: post.enable_comments,
      readability_score: readability.score,
      flesch_score: readability.flesch,
      secondary_keywords: post.secondary_keywords,
      source_name: post.source_name,
      original_source_url: post.original_source_url,
      updated_at: now,
    }

    try {
      if (post.id) {
        const { error } = await supabase.from("posts").update(payload).eq("id", post.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("posts").insert(payload).select("id").single()
        if (error) throw error
        if (data) setPost(prev => ({ ...prev, id: data.id }))
      }

      if (seoResult.score < 40) {
        const proceed = window.confirm(`SEO score is ${seoResult.score}/100. Are you sure you want to publish?`)
        if (!proceed) { setIsSaving(false); return }
      }

      setLastSaved(new Date())
      setDirty(false)
      localStorage.removeItem(DRAFT_KEY)
      router.push(`/admin/posts`)
    } catch (err) {
      alert("Error publishing post.")
    }
    setIsSaving(false)
  }, [post, seoKeyword, categories, router])

  const schedule = useCallback(async (when: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setIsSaving(true)
    const payload = {
      ...post,
      author_id: user.id,
      status: "scheduled" as PostStatus,
      scheduled_at: when,
      updated_at: new Date().toISOString(),
    }

    try {
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
    } catch {
      alert("Error scheduling post.")
    }
    setIsSaving(false)
  }, [post, router])

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage.from("post-images").upload(fileName, file)
    if (error) {
      alert("Upload failed: " + error.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(fileName)
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
