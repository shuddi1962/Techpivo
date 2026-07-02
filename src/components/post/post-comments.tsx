"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown, MessageSquare, CornerDownRight, Send, User as UserIcon, Star } from "lucide-react"

interface PostCommentsProps {
  postId: string
}

interface DiscussionComment {
  id: string
  post_id: string
  author_id: string | null
  parent_id: string | null
  content: string
  like_count: number
  reply_count: number
  is_hidden: boolean
  created_at: string
  author?: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
    level: number
  } | null
  user_vote?: number
  user_liked?: boolean
}

export function PostComments({ postId }: PostCommentsProps) {
  const [comments, setComments] = useState<DiscussionComment[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [content, setContent] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyToName, setReplyToName] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [guestName, setGuestName] = useState("")
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from("user_profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          setUserProfile(data)
        })
      }
    })
  }, [])

  const fetchComments = useCallback(async () => {
    const { data: discussions } = await supabase
      .from("article_discussions")
      .select("*, author:user_profiles(username, full_name, avatar_url, level)")
      .eq("post_id", postId)
      .eq("is_hidden", false)
      .is("parent_id", null)
      .order("created_at", { ascending: false })

    if (!discussions) { setLoading(false); return }

    const enriched = await Promise.all(
      discussions.map(async (d) => {
        let user_vote = 0
        let user_liked = false
        if (user) {
          const { data: vote } = await supabase
            .from("forum_votes")
            .select("vote_type")
            .eq("reply_id", d.id)
            .eq("user_id", user.id)
            .single()
          user_vote = vote?.vote_type || 0
        }
        return { ...d, user_vote, user_liked }
      })
    )

    setComments(enriched)
    setLoading(false)
  }, [postId, user])

  useEffect(() => { fetchComments() }, [fetchComments])

  const fetchReplies = async (parentId: string): Promise<DiscussionComment[]> => {
    const { data } = await supabase
      .from("article_discussions")
      .select("*, author:user_profiles(username, full_name, avatar_url, level)")
      .eq("parent_id", parentId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true })
    return (data || []) as DiscussionComment[]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (!user && !guestName.trim()) return

    setSubmitting(true)
    const { data, error } = await supabase
      .from("article_discussions")
      .insert({
        post_id: postId,
        author_id: user?.id || null,
        parent_id: replyTo,
        content: content.trim(),
      })
      .select("*, author:user_profiles(username, full_name, avatar_url, level)")
      .single()

    if (!error && data) {
      if (replyTo) {
        setComments(prev => prev.map(c =>
          c.id === replyTo ? { ...c, reply_count: c.reply_count + 1 } : c
        ))
      } else {
        setComments(prev => [data, ...prev])
      }
      setContent("")
      setReplyTo(null)
      setReplyToName("")
    }
    setSubmitting(false)
  }

  const handleVote = async (commentId: string, voteType: number) => {
    if (!user) return
    await supabase.from("forum_votes").upsert({
      user_id: user.id,
      reply_id: commentId,
      vote_type: voteType,
    }, { onConflict: "user_id,reply_id" })
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, like_count: c.like_count + voteType, user_vote: voteType } : c
    ))
  }

  const handleLike = async (commentId: string) => {
    if (!user) return
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, like_count: c.like_count + 1, user_liked: true } : c
    ))
  }

  const topLevel = comments.filter(c => !c.parent_id)

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Discussion
        </h3>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Discussion {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment Form */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {replyTo && (
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                <span className="flex items-center gap-1">
                  <CornerDownRight className="h-3 w-3" />
                  Replying to <strong>{replyToName}</strong>
                </span>
                <button type="button" onClick={() => { setReplyTo(null); setReplyToName("") }} className="text-primary hover:underline">
                  Cancel
                </button>
              </div>
            )}
            {!user && (
              <input
                type="text"
                placeholder="Your name *"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                required
              />
            )}
            {user && userProfile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {userProfile.full_name?.[0] || user.email?.[0] || "?"}
                </div>
                <span className="font-medium">{userProfile.full_name || user.email?.split("@")[0]}</span>
                <Badge variant="secondary" className="text-[10px]">Lv.{userProfile.level}</Badge>
              </div>
            )}
            <Textarea
              placeholder={user ? "Share your thoughts..." : "Write your comment..."}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              required
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {user ? "Posting as authenticated user" : "Posting as guest"}
              </p>
              <Button type="submit" disabled={submitting || !content.trim()} size="sm">
                <Send className="h-3.5 w-3.5 mr-1" />
                {submitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {topLevel.map(comment => (
          <CommentThread
            key={comment.id}
            comment={comment}
            postId={postId}
            user={user}
            userProfile={userProfile}
            onReply={(id, name) => { setReplyTo(id); setReplyToName(name) }}
            fetchReplies={fetchReplies}
            onVote={handleVote}
            onLike={handleLike}
          />
        ))}
        {topLevel.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No comments yet. Start the discussion!</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface CommentThreadProps {
  comment: DiscussionComment
  postId: string
  user: User | null
  userProfile: any
  onReply: (id: string, name: string) => void
  fetchReplies: (parentId: string) => Promise<DiscussionComment[]>
  onVote: (commentId: string, voteType: number) => void
  onLike: (commentId: string) => void
}

function CommentThread({ comment, postId, user, userProfile, onReply, fetchReplies, onVote, onLike }: CommentThreadProps) {
  const [replies, setReplies] = useState<DiscussionComment[]>([])
  const [showReplies, setShowReplies] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)
  const supabase = createClient()

  const loadReplies = async () => {
    if (showReplies) { setShowReplies(false); return }
    setLoadingReplies(true)
    const data = await fetchReplies(comment.id)
    setReplies(data)
    setShowReplies(true)
    setLoadingReplies(false)
  }

  const submitReply = async () => {
    if (!replyContent.trim()) return
    setSubmittingReply(true)
    const { data, error } = await supabase
      .from("article_discussions")
      .insert({
        post_id: postId,
        author_id: user?.id || null,
        parent_id: comment.id,
        content: replyContent.trim(),
      })
      .select("*, author:user_profiles(username, full_name, avatar_url, level)")
      .single()
    if (!error && data) {
      setReplies(prev => [...prev, data])
      setReplyContent("")
    }
    setSubmittingReply(false)
  }

  const authorName = comment.author?.full_name || comment.author?.username || "Anonymous"
  const authorLevel = comment.author?.level || 1

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {comment.author?.avatar_url ? (
              <img src={comment.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              authorName[0]
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{authorName}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Lv.{authorLevel}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={() => user && onVote(comment.id, comment.user_vote === 1 ? 0 : 1)}
            className={`flex items-center gap-1 transition-colors ${comment.user_vote === 1 ? "text-primary font-medium" : "hover:text-primary"}`}
            disabled={!user}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {comment.like_count > 0 && comment.like_count}
          </button>
          <button
            onClick={() => user && onVote(comment.id, comment.user_vote === -1 ? 0 : -1)}
            className={`flex items-center gap-1 transition-colors ${comment.user_vote === -1 ? "text-red-500 font-medium" : "hover:text-red-500"}`}
            disabled={!user}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onReply(comment.id, authorName)}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Reply
          </button>
          {comment.reply_count > 0 && (
            <button onClick={loadReplies} className="flex items-center gap-1 hover:text-primary transition-colors">
              <CornerDownRight className="h-3.5 w-3.5" />
              {loadingReplies ? "Loading..." : `${comment.reply_count} ${comment.reply_count === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>
      </div>

      {/* Inline reply form */}
      {showReplies && (
        <div className="ml-6 space-y-3 border-l-2 border-primary/20 pl-4">
          {replies.map(reply => {
            const rName = reply.author?.full_name || reply.author?.username || "Anonymous"
            return (
              <div key={reply.id} className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {reply.author?.avatar_url ? (
                      <img src={reply.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      rName[0]
                    )}
                  </div>
                  <span className="font-medium text-xs">{rName}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">Lv.{reply.author?.level || 1}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(reply.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.content}</p>
              </div>
            )
          })}

          {/* Reply input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Write a reply..."
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submitReply())}
              className="flex-1 px-3 py-2 text-sm rounded-md border bg-background"
            />
            <Button size="sm" onClick={submitReply} disabled={submittingReply || !replyContent.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
