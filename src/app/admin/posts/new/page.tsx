"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { slugify } from "@/lib/utils"
import { Save, Send, Sparkles, X } from "lucide-react"
import type { Category } from "@/types/database"

export default function NewPostPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [content, setContent] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [status, setStatus] = useState<"draft" | "published">("draft")
  const [categoryId, setCategoryId] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")

  // Load categories
  useState(() => {
    const supabase = createClient()
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data) setCategories(data)
    })
  })

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slug) setSlug(slugify(value))
  }

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const handleAiGenerate = async () => {
    if (!aiPrompt) return
    setAiLoading(true)
    try {
      const res = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Write an engaging tech blog post about: ${aiPrompt}. Format as HTML with H2/H3 headings. Include introduction and conclusion.`,
        }),
      })
      const data = await res.json()
      if (data.content) {
        setTitle(data.content.title || title)
        setContent(data.content.body || data.content)
        setExcerpt(data.content.excerpt || "")
      }
    } catch (err) {
      console.error("AI generation failed:", err)
    }
    setAiLoading(false)
  }

  const handleSave = async (publish: boolean) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const postData = {
      title,
      slug: slug || slugify(title),
      content,
      excerpt: excerpt || content.replace(/<[^>]*>/g, "").slice(0, 160),
      category_id: categoryId || categories[0]?.id,
      author_id: user.id,
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
      tags,
      reading_time: Math.ceil((content.split(/\s+/).length || 1) / 200),
    }

    const { data, error } = await supabase.from("posts").insert(postData).select().single()
    if (error) {
      alert("Error saving post: " + error.message)
    } else {
      router.push(`/admin/posts/${data.id}/edit`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">New Post</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave(false)}>
            <Save className="h-4 w-4 mr-2" />Save Draft
          </Button>
          <Button onClick={() => handleSave(true)}>
            <Send className="h-4 w-4 mr-2" />Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Post title..."
                  className="text-lg font-bold"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post-slug" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Excerpt</label>
                <Textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Content (HTML)</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="<h2>Introduction</h2><p>Write your post content in HTML...</p>"
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Post Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tags</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-amber" />
                AI Writing Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Enter a topic or keyword..."
                rows={3}
              />
              <Button onClick={handleAiGenerate} disabled={aiLoading} className="w-full">
                {aiLoading ? "Generating..." : "Generate Post"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
