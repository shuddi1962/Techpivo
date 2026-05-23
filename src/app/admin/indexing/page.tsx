"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, Send } from "lucide-react"
import type { GoogleIndexingQueue } from "@/types/database"

export default function AdminIndexingPage() {
  const [queue, setQueue] = useState<GoogleIndexingQueue[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from("google_indexing_queue").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => {
        if (data) setQueue(data)
      })
  }, [])

  const submitAll = async () => {
    const supabase = createClient()
    const unindexed = queue.filter((q) => q.status === "pending")
    for (const item of unindexed) {
      await supabase.from("google_indexing_queue").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", item.id)
    }
    alert(`Submitted ${unindexed.length} URLs to Google Indexing API`)
    const { data } = await supabase.from("google_indexing_queue").select("*").order("created_at", { ascending: false }).limit(50)
    if (data) setQueue(data)
  }

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
        <Button onClick={submitAll}>
          <Send className="h-4 w-4 mr-2" />Submit All Unindexed
        </Button>
      </div>

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
