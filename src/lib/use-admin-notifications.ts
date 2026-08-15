"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface AdminNotification {
  id: string
  type: "critical" | "warning" | "info" | "success"
  title: string
  message: string
  timestamp: string
  href?: string
  read: boolean
}

const READ_KEY = "tp_admin_notif_read_v1"

function getReadSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]") as string[])
  } catch {
    return new Set()
  }
}

function saveReadSet(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
  } catch {}
}

export function useAdminNotifications() {
  const supabaseRef = useRef(createClient())
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const busyRef = useRef(false)

  const refresh = useCallback(async (quiet = false) => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const supabase = supabaseRef.current
      const notifs: AdminNotification[] = []
      const now = new Date().toISOString()
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const [
        seoRes, failedRes, commentsRes, ordersRes, recentPostsRes, subsRes,
      ] = await Promise.all([
        supabase.from("seo_issues").select("*", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("google_indexing_queue").select("*", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ad_campaigns").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("posts").select("id, title").eq("status", "published").gte("published_at", dayAgo).order("published_at", { ascending: false }).limit(3),
        supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active").gte("subscribed_at", dayAgo),
      ])

      const seoCount = seoRes.count || 0
      const failedCount = failedRes.count || 0
      const pendingComments = commentsRes.count || 0
      const pendingOrders = ordersRes.count || 0
      const subsToday = subsRes.count || 0
      const recentPosts = recentPostsRes.data || []

      if (seoCount > 0) {
        notifs.push({
          id: "seo-issues",
          type: "warning",
          title: "SEO Issues Detected",
          message: `${seoCount} unresolved SEO issue${seoCount === 1 ? "" : "s"} need attention`,
          timestamp: now,
          href: "/admin/seo",
          read: false,
        })
      }

      if (failedCount > 0) {
        notifs.push({
          id: "indexing-failed",
          type: "critical",
          title: "Indexing Failures",
          message: `${failedCount} URL${failedCount === 1 ? "" : "s"} failed to index. Check the indexing queue.`,
          timestamp: now,
          href: "/admin/indexing",
          read: false,
        })
      }

      if (pendingComments > 0) {
        notifs.push({
          id: "pending-comments",
          type: "info",
          title: "Pending Comments",
          message: `${pendingComments} comment${pendingComments === 1 ? "" : "s"} awaiting moderation`,
          timestamp: now,
          href: "/admin/comments",
          read: false,
        })
      }

      if (pendingOrders > 0) {
        notifs.push({
          id: "pending-orders",
          type: "warning",
          title: "Pending Ad Orders",
          message: `${pendingOrders} campaign order${pendingOrders === 1 ? "" : "s"} awaiting review`,
          timestamp: now,
          href: "/admin/ads",
          read: false,
        })
      }

      if (recentPosts.length > 0) {
        notifs.push({
          id: "recent-publications",
          type: "success",
          title: "Recent Publications",
          message: `${recentPosts.length} article${recentPosts.length === 1 ? "" : "s"} published in the last 24 hours`,
          timestamp: now,
          href: "/admin/posts",
          read: false,
        })
      }

      if (subsToday > 0) {
        notifs.push({
          id: "new-subscribers",
          type: "success",
          title: "New Subscribers",
          message: `${subsToday} new newsletter subscriber${subsToday === 1 ? "" : "s"} today`,
          timestamp: now,
          href: "/admin/newsletter",
          read: false,
        })
      }

      const readSet = getReadSet()
      const withRead = notifs.map((n) => ({ ...n, read: readSet.has(n.id) }))
      setNotifications(withRead)
      setUnreadCount(withRead.filter((n) => !n.read).length)
      setLoading(false)
      if (!quiet) busyRef.current = false
    } catch (err) {
      console.error("Notifications fetch error:", err)
    } finally {
      busyRef.current = false
    }
  }, [])

  const markRead = useCallback((id: string) => {
    const readSet = getReadSet()
    readSet.add(id)
    saveReadSet(readSet)
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      setUnreadCount(next.filter((n) => !n.read).length)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    const readSet = getReadSet()
    notifications.forEach((n) => readSet.add(n.id))
    saveReadSet(readSet)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [notifications])

  useEffect(() => {
    refresh()

    const client = supabaseRef.current
    const channel = client
      .channel(`admin_notifications_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_issues" }, () => refresh(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "google_indexing_queue" }, () => refresh(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => refresh(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => refresh(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refresh(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "subscribers" }, () => refresh(true))
      .subscribe()

    const interval = setInterval(() => refresh(true), 30000)
    const onFocus = () => refresh(true)
    window.addEventListener("focus", onFocus)

    return () => {
      client.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [refresh])

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead }
}
