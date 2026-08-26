"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Mail, Search, Trash2, Eye, EyeOff, RefreshCw, AlertCircle } from "lucide-react"

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) {
      console.error("Failed to load contact messages:", error)
      if (!quiet) setError(error.message)
    } else {
      setMessages((data as any[]) || [])
      setError("")
      setLastSync(new Date())
    }
    if (!quiet) setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`admin_contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => load(true))
      .subscribe()
    const interval = setInterval(() => load(true), 30000)
    const onFocus = () => load(true)
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, load])

  const filtered = messages.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.subject?.toLowerCase().includes(q) ||
      m.message?.toLowerCase().includes(q)
    )
  })

  const unreadCount = messages.filter((m) => !m.is_read).length

  const markRead = async (id: string) => {
    const { error } = await supabase.from("contact_messages").update({ is_read: true }).eq("id", id)
    if (!error) setMessages(messages.map((m) => (m.id === id ? { ...m, is_read: true } : m)))
  }

  const markUnread = async (id: string) => {
    const { error } = await supabase.from("contact_messages").update({ is_read: false }).eq("id", id)
    if (!error) setMessages(messages.map((m) => (m.id === id ? { ...m, is_read: false } : m)))
  }

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("contact_messages").delete().eq("id", id)
    if (!error) {
      setMessages(messages.filter((m) => m.id !== id))
      if (expandedId === id) setExpandedId(null)
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId !== id) markRead(id)
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contact Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {messages.length} total · {unreadCount} unread · {lastSync ? `synced ${lastSync.toLocaleTimeString()}` : "…"}
          </p>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, subject, or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading messages...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No messages found</p>
        ) : (
          filtered.map((msg) => (
            <Card key={msg.id} className={msg.is_read ? "" : "border-l-4 border-l-primary"}>
              <CardContent className="p-4">
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => toggleExpand(msg.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{msg.name}</span>
                      <span className="text-xs text-muted-foreground">{msg.email}</span>
                      {msg.subject && (
                        <Badge variant="outline" className="text-xs">{msg.subject}</Badge>
                      )}
                      {!msg.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    {expandedId !== msg.id && (
                      <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpand(msg.id)}
                      title={expandedId === msg.id ? "Collapse" : "Expand"}
                    >
                      {expandedId === msg.id ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => (msg.is_read ? markUnread(msg.id) : markRead(msg.id))}
                      title={msg.is_read ? "Mark unread" : "Mark read"}
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMessage(msg.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
                {expandedId === msg.id && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Reply to:{" "}
                        <a href={`mailto:${msg.email}`} className="underline hover:text-foreground">
                          {msg.email}
                        </a>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
