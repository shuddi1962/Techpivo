"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Post } from "@/types/database"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Search } from "lucide-react"

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const [results, setResults] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState(query)

  useEffect(() => {
    if (!query) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .textSearch("search_vector", query, {
        type: "websearch",
        config: "english",
      })
      .order("views", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setResults(data)
        setLoading(false)
      })
  }, [query])

  return (
    <div className="container py-6">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold mb-4">Search</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            window.location.href = `/search?q=${encodeURIComponent(searchInput)}`
          }}
          className="flex gap-2"
        >
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search articles..."
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>
      </div>

      {query && (
        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground mb-6">
            {loading ? "Searching..." : `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`}
          </p>

          <div className="space-y-6">
            {results.map((post) => (
              <Link key={post.id} href={`/${post.slug}`} className="flex gap-4 group">
                <div
                  className="w-32 h-24 shrink-0 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/200/150"})` }}
                />
                <div>
                  <h2 className="font-semibold group-hover:text-brand-indigo line-clamp-2">{post.title}</h2>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{post.excerpt}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.published_at ? formatDate(post.published_at) : ""} · {post.reading_time} min read
                  </p>
                </div>
              </Link>
            ))}
            {!loading && query && results.length === 0 && (
              <p className="text-center py-12 text-muted-foreground">No results found. Try a different search term.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container py-6"><p className="text-muted-foreground">Loading search...</p></div>}>
      <SearchContent />
    </Suspense>
  )
}
