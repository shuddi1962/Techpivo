"use client"

import { Suspense, useState, useEffect, useRef } from "react"
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
  const [done, setDone] = useState(false)
  const noindexInjected = useRef(false)

  useEffect(() => {
    if (noindexInjected.current) return
    noindexInjected.current = true
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex, follow"
    document.head.appendChild(meta)
  }, [])

  useEffect(() => {
    if (!query) { setDone(false); return }
    setLoading(true)
    setDone(false)
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
        setDone(true)
      })
  }, [query])

  const noResults = done && results.length === 0

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

          {noResults ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search terms or browse our categories.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-sm text-primary font-medium hover:underline"
              >
                Go to Homepage
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {results.map((post) => (
                <Link key={post.id} href={`/${post.slug}`} className="flex gap-4 group">
                  <div
                    className="w-32 h-24 shrink-0 rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.featured_image || "/api/placeholder/200/150"})` }}
                  />
                  <div>
                    <h2 className="font-semibold group-hover:text-brand-amber line-clamp-2">{post.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{post.excerpt}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {post.published_at ? formatDate(post.published_at) : ""} · {post.reading_time} min read
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
