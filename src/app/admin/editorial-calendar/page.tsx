"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Calendar, ChevronLeft, ChevronRight, Plus, FileText,
  Clock, LayoutGrid, List
} from "lucide-react"

interface CalendarEvent {
  id: string
  title: string
  date: string
  status: "draft" | "scheduled" | "published"
  category: string
}

export default function EditorialCalendarPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [view] = useState<"month" | "week">("month")
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    setError("")
    try {
      const { data: posts, error: postsErr } = await supabase
        .from("posts")
        .select("id, title, status, published_at, scheduled_at, created_at, category_id, categories!inner(name)")
        .in("status", ["published", "scheduled", "draft"])
        .order("published_at", { ascending: false })
        .limit(100)

      if (postsErr) {
        const { data: postsFallback, error: fallbackErr } = await supabase
          .from("posts")
          .select("id, title, status, published_at, scheduled_at, created_at, category_id")
          .in("status", ["published", "scheduled", "draft"])
          .order("published_at", { ascending: false })
          .limit(100)
        if (fallbackErr) throw fallbackErr
        if (postsFallback) {
          const { data: categories } = await supabase.from("categories").select("id, name")
          const catMap: Record<string, string> = {}
          if (categories) categories.forEach(c => { catMap[c.id] = c.name })
          setEvents(postsFallback.map(p => ({
            id: p.id,
            title: p.title,
            date: p.published_at || p.scheduled_at || p.created_at,
            status: p.status as "draft" | "scheduled" | "published",
            category: catMap[p.category_id] || "Uncategorized",
          })))
        }
      } else if (posts) {
        setEvents(posts.map(p => ({
          id: p.id,
          title: p.title,
          date: p.published_at || p.scheduled_at || p.created_at,
          status: p.status as "draft" | "scheduled" | "published",
          category: (p as any).categories?.name || "Uncategorized",
        })))
      }
    } catch (err) {
      console.error("Failed to fetch calendar:", err)
      setError("Failed to load calendar data.")
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const startDay = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const d = new Date(e.date)
      return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()
    })
  }

  const monthName = currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-500" />
            Editorial Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Plan and schedule content</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg p-0.5">
            <button className="px-3 py-1 rounded-md text-sm bg-background shadow-sm">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className="px-3 py-1 rounded-md text-sm text-muted-foreground">
              <List className="h-4 w-4" />
            </button>
          </div>
          <a
            href="/admin/posts/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Article
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">{monthName}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-background p-2 min-h-[100px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayEvents = getEventsForDay(day)
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth()

              return (
                <div key={day} className={`bg-background p-2 min-h-[100px] ${isToday ? "ring-2 ring-primary" : ""}`}>
                  <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>{day}</span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <a
                        key={event.id}
                        href={`/admin/posts/${event.id}/edit`}
                        className={`block px-1.5 py-0.5 rounded text-xs truncate hover:opacity-80 transition-opacity ${
                          event.status === "published" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                          event.status === "scheduled" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                          "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                        title={`${event.title} (${event.status})`}
                      >
                        {event.title.slice(0, 25)}
                      </a>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-card border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Upcoming Scheduled
        </h3>
        <div className="space-y-2">
          {events
            .filter(e => e.status === "scheduled")
            .slice(0, 5)
            .map(event => (
              <a
                key={event.id}
                href={`/admin/posts/${event.id}/edit`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium shrink-0">Scheduled</span>
                  <span className="text-sm font-medium truncate">{event.title}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{event.category}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </a>
            ))}
          {events.filter(e => e.status === "scheduled").length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No scheduled articles</p>
          )}
        </div>
      </div>
    </div>
  )
}
