"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"
import type { Category } from "@/types/database"

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  const handleSave = async () => {
    const supabase = createClient()
    if (editing) {
      await supabase.from("categories").update({ name, slug }).eq("id", editing)
    } else {
      await supabase.from("categories").insert({ name, slug })
    }
    setName("")
    setSlug("")
    setEditing(null)
    const { data } = await supabase.from("categories").select("*").order("name")
    if (data) setCategories(data)
  }

  const handleEdit = (cat: Category) => {
    setName(cat.name)
    setSlug(cat.slug)
    setEditing(cat.id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return
    const supabase = createClient()
    await supabase.from("categories").delete().eq("id", id)
    setCategories(categories.filter((c) => c.id !== id))
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Categories</h1>

      <Card className="mb-8">
        <CardHeader><CardTitle className="text-lg">{editing ? "Edit" : "Add"} Category</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="flex-1" />
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="category-slug" className="flex-1" />
            <Button onClick={handleSave}>{editing ? "Update" : "Add"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-sm text-muted-foreground">/{cat.slug}</p>
              </div>
              <div className="flex gap-2">
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
    </div>
  )
}
