"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Category, Post } from "@/types/database"
import { SITE_NAME } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Footer() {
  const [categories, setCategories] = useState<Category[]>([])
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [email, setEmail] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.from("categories").select("*").order("name").limit(6).then(({ data }) => {
      if (data) setCategories(data)
    })
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setRecentPosts(data)
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
    <footer className="bg-brand-navy text-white mt-12">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="text-2xl font-black">
              BLIZ<span className="text-brand-indigo">9</span>INE
            </Link>
            <p className="mt-2 text-sm text-gray-400">Tech, decoded. Fast.</p>
            <p className="mt-4 text-xs text-gray-500">
              Your source for the latest in tech news, tutorials, reviews, and insights.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Categories</h4>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Recent Posts</h4>
            <ul className="space-y-2">
              {recentPosts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/${post.slug}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors line-clamp-1"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Newsletter</h4>
            <p className="text-sm text-gray-400 mb-3">Get the latest tech news delivered to your inbox.</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              />
              <Button onClick={handleSubscribe} className="shrink-0">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
