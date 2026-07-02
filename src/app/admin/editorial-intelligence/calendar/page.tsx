"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calendar, ArrowLeft, RefreshCw, ChevronLeft, ChevronRight,
  Clock, Rocket, FileText, Zap, TrendingUp, Newspaper
} from "lucide-react"

interface CalendarEvent {
  date: string
  articles: number
  launches?: string[]
  events?: string[]
}

export default function CalendarPage() {
  const [calendarData, setCalendarData] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetch("/admin/editorial-intelligence/api?section=calendar")
      .then(r => r.json())
      .then(d => { setCalendarData(d.calendar || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading content calendar...</p>
        </div>
      </div>
    )
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const getEventsForDay = (day: number): CalendarEvent | undefined => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return calendarData.find(e => e.date === dateStr)
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const totalArticlesThisMonth = calendarData
    .filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .reduce((a, e) => a + e.articles, 0)

  const totalArticlesThisWeek = calendarData
    .filter(e => {
      const d = new Date(e.date)
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      return d >= weekStart && d < weekEnd
    })
    .reduce((a, e) => a + e.articles, 0)

  const upcomingLaunches = calendarData
    .filter(e => e.launches && e.launches.length > 0 && new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/editorial-intelligence" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" />
            Back to Editorial Intelligence
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-green-500" />
            Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Smart scheduling with launch events and content planning
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">This Week</span>
          </div>
          <div className="text-2xl font-bold">{totalArticlesThisWeek}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">This Month</span>
          </div>
          <div className="text-2xl font-bold">{totalArticlesThisMonth}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Upcoming Launches</span>
          </div>
          <div className="text-2xl font-bold">{upcomingLaunches.length}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-cyan-500" />
            <span className="text-xs text-muted-foreground">Days with Content</span>
          </div>
          <div className="text-2xl font-bold">
            {calendarData.filter(e => {
              const d = new Date(e.date)
              return d.getFullYear() === year && d.getMonth() === month && e.articles > 0
            }).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-base">Monthly View</h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-medium text-sm min-w-[140px] text-center">{monthName}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const events = getEventsForDay(day)
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const isToday = dateStr === todayStr
              const hasLaunch = events?.launches && events.launches.length > 0
              const hasContent = events && events.articles > 0

              return (
                <div
                  key={day}
                  className={`aspect-square p-1.5 rounded-lg border text-sm relative transition-colors ${
                    isToday
                      ? "border-primary bg-primary/10"
                      : hasContent
                      ? "border-muted bg-muted/20 hover:bg-muted/40"
                      : "border-transparent hover:bg-muted/20"
                  }`}
                >
                  <div className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                    {day}
                  </div>
                  {hasContent && (
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <div className="text-[9px] text-muted-foreground text-center">
                        {events!.articles} article{events!.articles !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}
                  {hasLaunch && (
                    <div className="absolute top-1.5 right-1.5">
                      <Rocket className="h-2.5 w-2.5 text-amber-500" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-amber-500" />
              Upcoming Launches
            </h3>
            {upcomingLaunches.length > 0 ? (
              <div className="space-y-3">
                {upcomingLaunches.map((event, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">{event.date}</div>
                    {event.launches?.map((launch, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <Rocket className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="font-medium">{launch}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming launches</p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              Content Summary
            </h3>
            <div className="space-y-2">
              {calendarData
                .filter(e => {
                  const d = new Date(e.date)
                  return d.getFullYear() === year && d.getMonth() === month
                })
                .sort((a, b) => b.articles - a.articles)
                .slice(0, 5)
                .map((event, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{event.date}</span>
                    <span className="font-medium">{event.articles} articles</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-blue-500" />
              Event Indicators
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded border border-primary bg-primary/10" />
                Today
              </div>
              <div className="flex items-center gap-2">
                <Rocket className="h-3 w-3 text-amber-500" />
                Product launch
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-muted/30" />
                Scheduled content
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
