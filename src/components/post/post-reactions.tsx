"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface PostReactionsProps {
  postId: string
}

interface ReactionCounts {
  fire: number
  clap: number
  "mind-blown": number
  meh: number
  disagree: number
}

const REACTIONS = [
  { type: "fire", label: "Fire", emoji: "🔥" },
  { type: "clap", label: "Clap", emoji: "👏" },
  { type: "mind-blown", label: "Mind Blown", emoji: "🤯" },
  { type: "meh", label: "Meh", emoji: "😐" },
  { type: "disagree", label: "Disagree", emoji: "👎" },
] as const

function getIpHash(): string {
  let hash = 0
  const ip = "client"
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return hash.toString(36)
}

export function PostReactions({ postId }: PostReactionsProps) {
  const [counts, setCounts] = useState<ReactionCounts>({
    fire: 0,
    clap: 0,
    "mind-blown": 0,
    meh: 0,
    disagree: 0,
  })
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchReactions = async () => {
      const { data } = await supabase
        .from("reactions")
        .select("type")
        .eq("post_id", postId)
      if (data) {
        const newCounts = { ...counts }
        data.forEach((r) => {
          const key = r.type as keyof ReactionCounts
          if (key in newCounts) newCounts[key]++
        })
        setCounts(newCounts)
      }
      setLoading(false)
    }
    fetchReactions()
  }, [postId])

  const handleReaction = useCallback(async (type: string) => {
    if (userReactions.has(type)) return
    const ipHash = getIpHash()

    setCounts((prev) => ({
      ...prev,
      [type]: prev[type as keyof ReactionCounts] + 1,
    }))
    setUserReactions((prev) => new Set(prev).add(type))

    await supabase.from("reactions").upsert(
      { post_id: postId, type, ip_hash: ipHash },
      { onConflict: "post_id,type,ip_hash" }
    )
  }, [postId, userReactions, supabase])

  if (loading) {
    return (
      <div className="flex items-center gap-4 py-4">
        {REACTIONS.map((r) => (
          <div key={r.type} className="h-10 w-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 py-4">
      {REACTIONS.map(({ type, label, emoji }) => (
        <button
          key={type}
          onClick={() => handleReaction(type)}
          disabled={userReactions.has(type)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-colors",
            userReactions.has(type)
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-primary hover:bg-accent"
          )}
          title={label}
        >
          <span className="text-lg">{emoji}</span>
          <span className="font-medium">{counts[type as keyof ReactionCounts]}</span>
        </button>
      ))}
    </div>
  )
}
