"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Comment } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"

interface PostCommentsProps {
  postId: string
}

export function PostComments({ postId }: PostCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [authorName, setAuthorName] = useState("")
  const [authorEmail, setAuthorEmail] = useState("")
  const [content, setContent] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .eq("status", "approved")
        .order("created_at", { ascending: true })
      if (data) setComments(data)
      setLoading(false)
    }
    fetchComments()
  }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authorName || !authorEmail || !content) return
    setSubmitting(true)
    await supabase.from("comments").insert({
      post_id: postId,
      parent_id: replyTo,
      author_name: authorName,
      author_email: authorEmail,
      content,
      status: "pending",
    })
    setSubmitting(false)
    setSubmitted(true)
    setAuthorName("")
    setAuthorEmail("")
    setContent("")
    setReplyTo(null)
  }

  const topLevel = comments.filter((c) => !c.parent_id)
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId)

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Comments</h3>
        <div className="h-20 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment Form */}
      <Card>
        <CardContent className="p-4">
          {submitted ? (
            <p className="text-sm text-muted-foreground">
              Thank you! Your comment has been submitted and is awaiting moderation.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {replyTo && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Replying to a comment</span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-primary hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Your name *"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                />
                <Input
                  type="email"
                  placeholder="Your email *"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  required
                />
              </div>
              <Textarea
                placeholder="Write your comment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Comment"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {topLevel.map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            replies={replies(comment.id)}
            onReply={setReplyTo}
            replyActive={replyTo === comment.id}
          />
        ))}
        {topLevel.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </div>
  )
}

interface CommentThreadProps {
  comment: Comment
  replies: Comment[]
  onReply: (id: string | null) => void
  replyActive: boolean
}

function CommentThread({ comment, replies, onReply, replyActive }: CommentThreadProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase">
            {comment.author_name[0]}
          </div>
          <div>
            <p className="text-sm font-medium">{comment.author_name}</p>
            <p className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
          </div>
        </div>
        <p className="text-sm">{comment.content}</p>
        <button
          onClick={() => onReply(replyActive ? null : comment.id)}
          className="text-xs text-muted-foreground hover:text-primary mt-2 transition-colors"
        >
          Reply
        </button>
      </div>

      {/* Nested Replies (2nd level) */}
      {replies.length > 0 && (
        <div className="ml-6 space-y-3 border-l-2 pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-lg border bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase">
                  {reply.author_name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{reply.author_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</p>
                </div>
              </div>
              <p className="text-sm">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
