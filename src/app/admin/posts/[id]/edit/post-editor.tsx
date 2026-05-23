"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Post } from "@/types/database"
import { Save, Send, Sparkles, X } from "lucide-react"

export function PostEditor({ post: initial }: { post: Post }) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [content, setContent] = useState(initial.content || "")
  const [excerpt, setExcerpt] = useState(initial.excerpt || "")
  const [status, setStatus] = useState(initial.status)
  const [tags, setTags] = useState<string[]>(initial.tags || [])
  const [tagInput, setTagInput] = useState("")

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput("")
    }
  }

  const handleSave = async (publish: boolean) => {
    const supabase = createClient()
    const updates = {
      title,
      slug,
      content,
      excerpt,
      tags,
      status: publish ? "published" : status,
      published_at: publish && !initial.published_at ? new Date().toISOString() : initial.published_at,
    }

    const { error } = await supabase.from("posts").update(updates).eq("id", initial.id)
    if (error) {
      alert("Error: " + error.message)
    } else {
      router.refresh()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold truncate">{title || "Edit Post"}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={status === "published" ? "default" : "secondary"}>{status}</Badge>
          <Button variant="outline" onClick={() => handleSave(false)}>
            <Save className="h-4 w-4 mr-2" />Save
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-bold" />
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20} className="font-mono text-sm" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Tags</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => setTags(tags.filter(t => t !== tag))}>
                    {tag} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
