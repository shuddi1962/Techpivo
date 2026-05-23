"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import type { Comment } from "@/types/database"

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from("comments").select("*, posts:post_id(title)").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => {
        if (data) setComments(data as any)
      })
  }, [])

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient()
    await supabase.from("comments").update({ status: status as any }).eq("id", id)
    setComments(comments.map((c) => c.id === id ? { ...c, status: status as any } : c))
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Comments</h1>

      <div className="space-y-3">
        {comments.map((comment: any) => (
          <Card key={comment.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{comment.author_name}</span>
                    <span className="text-xs text-muted-foreground">{comment.author_email}</span>
                    <Badge variant={comment.status === "approved" ? "default" : comment.status === "pending" ? "secondary" : "destructive"}>
                      {comment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                  {comment.posts && <p className="text-xs text-muted-foreground mt-1">On: {comment.posts.title}</p>}
                </div>
                <div className="flex gap-1 shrink-0 ml-4">
                  {comment.status !== "approved" && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, "approved")}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                  )}
                  {comment.status !== "spam" && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, "spam")}>
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
