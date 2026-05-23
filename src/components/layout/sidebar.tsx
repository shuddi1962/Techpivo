"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Post, Category } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import { ExternalLink } from "lucide-react"

export function Sidebar() {
  const [popularPosts, setPopularPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [email, setEmail] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("views", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setPopularPosts(data)
      })
    supabase.from("categories").select("*").order("name").then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  const handleSubscribe = async () => {
    if (!email) return
    const supabase = createClient()
    await supabase.from("subscribers").insert({ email })
    setEmail("")
    alert("Subscribed!")
  }

  return (
    <aside className="space-y-6">
      {/* Newsletter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stay Connected</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Get the latest tech news delivered to your inbox.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={handleSubscribe} size="sm">Go</Button>
          </div>
        </CardContent>
      </Card>

      {/* Popular Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular This Week</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {popularPosts.map((post, i) => (
            <Link key={post.id} href={`/${post.slug}`} className="flex gap-3 group">
              <span className="text-2xl font-black text-muted-foreground/30 w-8 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h4 className="text-sm font-medium line-clamp-2 group-hover:text-brand-indigo transition-colors">
                  {post.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {post.published_at ? formatDate(post.published_at) : ""}
                </p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                {cat.name}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Ad Slot */}
      <div className="ad-container min-h-[250px]">
        <span className="ad-label">Advertisement</span>
        <p className="text-xs text-muted-foreground">300 × 250</p>
      </div>
    </aside>
  )
}
