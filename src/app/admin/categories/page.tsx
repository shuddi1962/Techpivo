"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react"
import type { Category } from "@/types/database"

export default function AdminCategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("name")
    if (data) setCategories(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCategories()
    const channel = supabase
      .channel(`admin_categories_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchCategories())
      .subscribe()
    channelRef.current = channel
    const poll = setInterval(() => fetchCategories(), 30000)
    const onFocus = () => fetchCategories()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channelRef.current!)
    }
  }, [supabase, fetchCategories])

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) return
    const now = new Date().toISOString()
    if (editing) {
      await supabase
        .from("categories")
        .update({ name: name.trim(), slug: slug.trim().toLowerCase().replace(/\s+/g, "-"), updated_at: now })
        .eq("id", editing)
    } else {
      await supabase.from("categories").insert({
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
        is_active: true,
      })
    }
    setName("")
    setSlug("")
    setEditing(null)
    fetchCategories()
  }

  const handleEdit = (cat: Category) => {
    setName(cat.name)
    setSlug(cat.slug)
    setEditing(cat.id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return
    await supabase.from("categories").delete().eq("id", id)
    fetchCategories()
  }

  const handleToggle = async (cat: Category) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c)),
    )
    await supabase
      .from("categories")
      .update({ is_active: !cat.is_active, updated_at: new Date().toISOString() })
      .eq("id", cat.id)
    fetchCategories()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Badge variant="outline" className="gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          LIVE · refreshes automatically
        </Badge>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">
            <Plus className="inline h-4 w-4 mr-1.5" />
            {editing ? "Edit" : "Add"} Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="flex-1" />
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="category-slug" className="flex-1" />
            <Button onClick={handleSave}>{editing ? "Update" : "Add"}</Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            New categories appear on the public pages in realtime. Toggle the eye to show or hide a category on the site without deleting it.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading categories...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className={cat.is_active ? "" : "opacity-70"}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{cat.name}</p>
                    <Badge variant={cat.is_active ? "default" : "secondary"} className={cat.is_active ? "bg-emerald-600" : ""}>
                      {cat.is_active ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">/{cat.slug}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggle(cat)}
                    title={cat.is_active ? "Hide from public pages" : "Show on public pages"}
                  >
                    {cat.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}