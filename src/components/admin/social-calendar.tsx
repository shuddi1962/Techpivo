"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock,
  Share2, Globe, AtSign, MessageCircle, Send, Megaphone,
} from "lucide-react"

interface ScheduledPost {
  id: string
  title: string
  platform: string
  scheduled_at: string
  status: string
  post_id: string
}

export function SocialCalendar() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    const { data } = await supabase
      .from("social_posts")
      .select("id, title, platform, scheduled_at, status, post_id")
      .gte("scheduled_at", start)
      .lte("scheduled_at", end)
      .order("scheduled_at", { ascending: true })

    setPosts(data || [])
    setLoading(false)
  }, [currentDate])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const platformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "facebook": return <Globe className="h-3 w-3" />
      case "twitter": case "x": return <AtSign className="h-3 w-3" />
      case "linkedin": return <Share2 className="h-3 w-3" />
      case "instagram": return <Megaphone className="h-3 w-3" />
      default: return <Globe className="h-3 w-3" />
    }
  }

  const platformColor = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "facebook": return "bg-blue-600"
      case "twitter": case "x": return "bg-sky-500"
      case "linkedin": return "bg-blue-700"
      case "instagram": return "bg-pink-600"
      default: return "bg-gray-500"
    }
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))

  const getPostsForDay = (day: number) =>
    posts.filter(p => new Date(p.scheduled_at).getDate() === day)

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-5 w-5 text-[#F59E0B]" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Social Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-[#374151] rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="bg-gray-50 dark:bg-[#1F2937] p-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white dark:bg-[#111827] p-2 min-h-[80px]" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayPosts = getPostsForDay(day)
          const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth()
          return (
            <div key={day} className={`bg-white dark:bg-[#111827] p-1.5 min-h-[80px] ${isToday ? "ring-2 ring-[#F59E0B] ring-inset" : ""}`}>
              <div className={`text-xs font-semibold mb-1 ${isToday ? "text-[#F59E0B]" : "text-gray-500 dark:text-gray-400"}`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map(post => (
                  <div key={post.id} className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${platformColor(post.platform)}`}>
                    {platformIcon(post.platform)} {post.title?.slice(0, 20)}
                  </div>
                ))}
                {dayPosts.length > 3 && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">+{dayPosts.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
