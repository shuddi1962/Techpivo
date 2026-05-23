"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Rss, Plus, RefreshCw } from "lucide-react"
import type { RssFeed, Category } from "@/types/database"

export default function AdminRssFeedsPage() {
  const [feeds, setFeeds] = useState<RssFeed[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [feedUrl, setFeedUrl] = useState("")
  const [feedName, setFeedName] = useState("")
  const [categoryId, setCategoryId] = useState("")

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("rss_feeds").select("*, category:categories(name)").order("feed_name"),
      supabase.from("categories").select("*").order("name"),
    ]).then(([feedsRes, catsRes]) => {
      if (feedsRes.data) setFeeds(feedsRes.data as any)
      if (catsRes.data) setCategories(catsRes.data)
    })
  }, [])

  const addFeed = async () => {
    if (!feedUrl || !feedName || !categoryId) return
    const supabase = createClient()
    await supabase.from("rss_feeds").insert({
      feed_url: feedUrl,
      feed_name: feedName,
      category_id: categoryId,
    })
    setFeedUrl("")
    setFeedName("")
    setCategoryId("")
    const { data } = await supabase.from("rss_feeds").select("*, category:categories(name)").order("feed_name")
    if (data) setFeeds(data as any)
  }

  const toggleActive = async (id: string, active: boolean) => {
    const supabase = createClient()
    await supabase.from("rss_feeds").update({ is_active: active }).eq("id", id)
  }

  const fetchNow = async (feed: RssFeed) => {
    const supabase = createClient()
    await supabase.from("rss_feeds").update({ last_fetched_at: new Date().toISOString() }).eq("id", feed.id)
    alert(`Fetch triggered for ${feed.feed_name}`)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">RSS Feeds</h1>

      <Card className="mb-8">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="h-4 w-4" />Add Feed</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input value={feedName} onChange={(e) => setFeedName(e.target.value)} placeholder="Feed name" />
            <Input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://example.com/feed.xml" />
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Category...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button onClick={addFeed}>Add Feed</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {feeds.map((feed: any) => (
          <Card key={feed.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Rss className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">{feed.feed_name}</p>
                  <p className="text-sm text-muted-foreground">{feed.feed_url}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{feed.category?.name}</Badge>
                    <span>{feed.posts_fetched} posts</span>
                    {feed.last_fetched_at && <span>Last fetched: {new Date(feed.last_fetched_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchNow(feed)}>
                  <RefreshCw className="h-3 w-3 mr-1" />Fetch
                </Button>
                <Switch checked={feed.is_active} onCheckedChange={(v) => toggleActive(feed.id, v)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
