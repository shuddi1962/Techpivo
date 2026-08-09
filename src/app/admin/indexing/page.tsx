"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, Send, Loader2, RefreshCw } from "lucide-react"
import type { GoogleIndexingQueue } from "@/types/database"

export default function AdminIndexingPage() {
  const [queue, setQueue] = useState<GoogleIndexingQueue[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://techpivo.com"

  const loadQueue = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from("google_indexing_queue").select("*").order("created_at", { ascending: false }).limit(50)
    if (data) setQueue(data)
  }, [])

  useEffect(() => {
    let mounted = true
    const supabase = createClient()
    const channel = supabase
      .channel(`indexing_rt_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "google_indexing_queue" }, () => {
        if (mounted) loadQueue()
      })
      .subscribe()
    const poll = setInterval(() => { if (mounted) loadQueue() }, 30000)
    const onFocus = () => { if (mounted) loadQueue() }
    window.addEventListener("focus", onFocus)
    return () => {
      mounted = false
      supabase.removeChannel(channel)
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [loadQueue])

  const syncQueue = useCallback(async () => {
    setSyncing(true)
    setSyncMsg("")
    try {
      const supabase = createClient()
      const { data: posts, error } = await supabase
        .from("posts")
        .select("slug")
        .eq("status", "published")
        .or("google_indexed.is.null,google_indexed.eq.false")
        .limit(300)
      if (error) throw error

      const { data: existing } = await supabase.from("google_indexing_queue").select("url")
      const existingUrls = new Set((existing || []).map((q) => q.url))

      const urls = [...new Set((posts || []).map((p) => `${siteUrl}/${p.slug}`).filter((u) => !existingUrls.has(u)))]
      if (urls.length > 0) {
        await supabase.from("google_indexing_queue").insert(urls.map((url) => ({ url, status: "pending" })))
      }
      setSyncMsg(urls.length > 0 ? `Queue synced — added ${urls.length} unindexed URL(s)` : "Queue is already up to date")
      await loadQueue()
    } catch (e) {
      setSyncMsg(`Sync failed: ${String(e)}`)
    }
    setSyncing(false)
  }, [siteUrl, loadQueue])

  useEffect(() => {
    syncQueue()
  }, [syncQueue])

  const submitAll = async () => {
    setSubmitting(true)
    const supabase = createClient()
    const unindexed = queue.filter((q) => q.status === "pending")
    const urls = unindexed.map((q) => q.url)
    if (urls.length === 0) {
      alert("No pending URLs to submit.")
      setSubmitting(false)
      return
    }
    try {
      const res = await fetch("/admin/indexing/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Submitted ${data.submitted} of ${unindexed.length} URLs to IndexNow API`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      alert("Failed to submit URLs to IndexNow API. Check console for details.")
      console.error("Indexing error:", err)
      for (const item of unindexed) {
        await supabase.from("google_indexing_queue").update({ status: "failed", submitted_at: new Date().toISOString() }).eq("id", item.id)
      }
    }
    await loadQueue()
    setSubmitting(false)
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length

  const statusColors: Record<string, string> = {
    pending: "secondary",
    submitted: "indigo",
    indexed: "default",
    failed: "destructive",
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Google Indexing</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={syncQueue} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync Queue
          </Button>
          <Button onClick={submitAll} disabled={submitting || pendingCount === 0}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit All Unindexed ({pendingCount})
          </Button>
        </div>
      </div>

      {syncMsg && <p className="text-sm text-muted-foreground mb-4">{syncMsg}</p>}

      <Card>
        <CardHeader><CardTitle className="text-lg">Indexing Queue</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{item.url}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={statusColors[item.status] as any}>{item.status}</Badge>
                  {item.submitted_at && <span className="text-xs text-muted-foreground">{new Date(item.submitted_at).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
            {queue.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No URLs in indexing queue.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
