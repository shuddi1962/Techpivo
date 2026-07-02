"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Rocket, Plus, Calendar, ExternalLink, Trash2,
  ChevronDown, ChevronUp, Search, Clock, Tag,
} from "lucide-react"

interface LaunchEvent {
  id: string
  name: string
  company: string
  event_type: string
  expected_date: string
  actual_date: string
  description: string
  status: string
  url: string
  created_at: string
}

const EVENT_TYPES = [
  "Smartphone Launch", "AI Model Release", "Software Update",
  "Developer Conference", "Product Announcement", "Security Advisory",
  "Game Launch", "Hardware Release",
]

export default function LaunchCenterPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<LaunchEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState("upcoming")
  const [search, setSearch] = useState("")
  const [newEvent, setNewEvent] = useState({
    name: "", company: "", event_type: "Smartphone Launch",
    expected_date: "", description: "", url: "",
  })

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("launch_events")
      .select("*")
      .order("expected_date", { ascending: true })

    if (filter === "upcoming") query = query.gte("expected_date", new Date().toISOString().split("T")[0])
    if (filter === "past") query = query.lt("expected_date", new Date().toISOString().split("T")[0])
    if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`)

    const { data } = await query
    setEvents(data || [])
    setLoading(false)
  }, [filter, search])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const createEvent = async () => {
    if (!newEvent.name) return
    await supabase.from("launch_events").insert({ ...newEvent, status: "expected" })
    setNewEvent({ name: "", company: "", event_type: "Smartphone Launch", expected_date: "", description: "", url: "" })
    setShowCreate(false)
    fetchEvents()
  }

  const deleteEvent = async (id: string) => {
    await supabase.from("launch_events").delete().eq("id", id)
    fetchEvents()
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "rumored": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "launched": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Launch Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track upcoming product launches and events</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Event
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
              placeholder="Event name" className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white" />
            <input type="text" value={newEvent.company} onChange={e => setNewEvent({ ...newEvent, company: e.target.value })}
              placeholder="Company" className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white" />
            <select value={newEvent.event_type} onChange={e => setNewEvent({ ...newEvent, event_type: e.target.value })}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-700 dark:text-gray-300">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" value={newEvent.expected_date} onChange={e => setNewEvent({ ...newEvent, expected_date: e.target.value })}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white" />
            <input type="text" value={newEvent.url} onChange={e => setNewEvent({ ...newEvent, url: e.target.value })}
              placeholder="URL (optional)" className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white" />
            <input type="text" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="Description" className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white" />
          </div>
          <div className="flex gap-2">
            <button onClick={createEvent} className="px-4 py-2 text-sm font-semibold bg-[#F59E0B] text-white rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#374151] rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400" />
        </div>
        <div className="flex gap-1">
          {["upcoming", "past", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg capitalize transition-colors ${
                filter === f ? "bg-[#F59E0B] text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2937] border border-gray-200 dark:border-[#374151]"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : events.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-sm text-gray-400">
          <Rocket className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No launch events found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-[#F59E0B]" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{event.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{event.company}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{event.expected_date ? new Date(event.expected_date).toLocaleDateString() : "TBA"}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.event_type}</span>
                  </div>
                  {event.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{event.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg">
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </a>
                  )}
                  <button onClick={() => deleteEvent(event.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
