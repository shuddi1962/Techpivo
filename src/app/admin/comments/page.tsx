"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Check, X, MessageSquare, Search, Trash2, Eye } from "lucide-react"
import type { Comment } from "@/types/database"

const tabs = [
  { id: "all", label: "All", icon: MessageSquare },
  { id: "pending", label: "Pending", icon: Eye },
  { id: "approved", label: "Approved", icon: Check },
  { id: "spam", label: "Spam", icon: X },
]

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const supabase = createClient()
    let q = supabase.from("comments").select("*, posts:post_id(title)").order("created_at", { ascending: false })
    if (activeTab !== "all") q = q.eq("status", activeTab)
    q.limit(100).then(({ data }) => {
      if (data) setComments(data as any)
    })
  }, [activeTab])

  const filtered = comments.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      if (!c.content?.toLowerCase().includes(q) && !c.author_name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const counts = {
    all: comments.length,
    pending: comments.filter(c => c.status === "pending").length,
    approved: comments.filter(c => c.status === "approved").length,
    spam: comments.filter(c => c.status === "spam").length,
  }

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient()
    await supabase.from("comments").update({ status: status as any }).eq("id", id)
    setComments(comments.map((c) => c.id === id ? { ...c, status: status as any } : c))
  }

  const deleteComment = async (id: string) => {
    const supabase = createClient()
    await supabase.from("comments").delete().eq("id", id)
    setComments(comments.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comments</h1>
          <p className="text-sm text-muted-foreground mt-1">{comments.length} total comments</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
              <Icon className="h-3.5 w-3.5" /> {tab.label}
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted">{counts[tab.id as keyof typeof counts]}</span>
            </button>
          )
        })}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search comments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="space-y-2">
        {filtered.map((comment: any) => (
          <Card key={comment.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium">{comment.author_name}</span>
                    <span className="text-xs text-muted-foreground">{comment.author_email}</span>
                    <Badge variant={comment.status === "approved" ? "default" : comment.status === "pending" ? "secondary" : "destructive"}>
                      {comment.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                  {comment.posts && <p className="text-xs text-muted-foreground mt-1">On: {comment.posts.title}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {comment.status !== "approved" && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, "approved")} title="Approve">
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                  )}
                  {comment.status === "approved" && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, "pending")} title="Unapprove">
                      <Eye className="h-4 w-4 text-yellow-500" />
                    </Button>
                  )}
                  {comment.status !== "spam" && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, "spam")} title="Mark Spam">
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteComment(comment.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No comments found</p>}
      </div>
    </div>
  )
}
