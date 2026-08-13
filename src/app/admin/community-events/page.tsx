"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft, Check, Eraser, Loader2, Trash2, Save, Eye, ExternalLink,
  Calendar, MapPin, Users, Globe, Pencil, Plus, RefreshCw, Image as ImageIcon,
} from "lucide-react"

interface CommunityEventRow {
  id: string
  title: string
  description: string | null
  event_type: string
  location: string | null
  url: string | null
  start_date: string
  end_date: string | null
  is_virtual: boolean
  max_participants: number | null
  current_participants: number
  is_published: boolean
  image_url: string | null
  created_by: string | null
  created_at: string
}

const EVENT_TYPES = ["conference", "meetup", "hackathon", "webinar", "workshop", "launch", "other"] as const
const TYPE_LABELS: Record<string, string> = {
  conference: "Conference", meetup: "Meetup", hackathon: "Hackathon",
  webinar: "Webinar", workshop: "Workshop", launch: "Product Launch", other: "Other",
}
const TYPE_COLORS: Record<string, string> = {
  conference: "bg-violet-500/10 text-violet-700 border-violet-200",
  meetup: "bg-blue-500/10 text-blue-700 border-blue-200",
  hackathon: "bg-orange-500/10 text-orange-700 border-orange-200",
  webinar: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  workshop: "bg-amber-500/10 text-amber-700 border-amber-200",
  launch: "bg-pink-500/10 text-pink-700 border-pink-200",
  other: "bg-gray-500/10 text-gray-700 border-gray-200",
}

const EMPTY_FORM = {
  id: "", title: "", description: "", event_type: "meetup" as string,
  location: "", url: "", start_date: "", end_date: "", is_virtual: false,
  max_participants: "", is_published: true, image_url: "",
}

export default function CommunityEventsAdminPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<CommunityEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formOpen, setFormOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("community_events")
      .select("*")
      .order("start_date", { ascending: true })
    if (data) setEvents(data as CommunityEventRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchEvents()
    const channel = supabase
      .channel(`admin_events_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_events" }, () => fetchEvents())
      .subscribe()
    channelRef.current = channel
    const poll = setInterval(() => fetchEvents(), 30000)
    const onFocus = () => fetchEvents()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channelRef.current!)
    }
  }, [supabase, fetchEvents])

  const postAction = async (body: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> => {
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      const res = await fetch("/api/admin/community/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      return { ok: res.ok, data: d, error: d?.error }
    } catch {
      return { ok: false, error: "Network error" }
    }
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormOpen(true)
    setError("")
  }

  const openEdit = (e: CommunityEventRow) => {
    setForm({
      id: e.id, title: e.title, description: e.description || "",
      event_type: e.event_type, location: e.location || "", url: e.url || "",
      start_date: e.start_date?.slice(0, 16) || "", end_date: e.end_date?.slice(0, 16) || "",
      is_virtual: e.is_virtual, max_participants: e.max_participants ? String(e.max_participants) : "",
      is_published: e.is_published, image_url: e.image_url || "",
    })
    setFormOpen(true)
    setError("")
  }

  const saveEvent = async () => {
    setSaving(true)
    setError("")
    if (!form.title.trim()) { setError("Title is required"); setSaving(false); return }
    if (!form.start_date) { setError("Start date is required"); setSaving(false); return }
    const r = await postAction({
      action: form.id ? "update" : "create",
      id: form.id || undefined,
      title: form.title,
      description: form.description,
      event_type: form.event_type,
      location: form.location,
      url: form.url,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      is_virtual: form.is_virtual,
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      is_published: form.is_published,
      image_url: form.image_url,
    })
    if (!r.ok) { setError(r.error || "Failed to save event"); setSaving(false); return }
    setFormOpen(false)
    fetchEvents()
    setSaving(false)
  }

  const togglePublish = async (e: CommunityEventRow) => {
    setBusyId(e.id)
    const r = await postAction({ action: "toggle", id: e.id })
    if (!r.ok) setError(r.error || "Failed to toggle publish state")
    setBusyId(null)
  }

  const deleteEvent = async (e: CommunityEventRow) => {
    if (!confirm(`Delete "${e.title}"? This cannot be undone.`)) return
    setBusyId(e.id)
    const r = await postAction({ action: "delete", id: e.id })
    if (!r.ok) setError(r.error || "Failed to delete event")
    setBusyId(null)
  }

  const publishedCount = events.filter(e => e.is_published).length
  const upcomingCount = events.filter(e => new Date(e.start_date) >= new Date()).length

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/community/events" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-4 w-4" /> View Public Page
            </Link>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 transition-all duration-200"
          >
            <Plus className="h-4 w-4" /> New Event
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Events", value: events.length, icon: Calendar, color: "text-amber-600 bg-amber-50" },
            { label: "Published", value: publishedCount, icon: Check, color: "text-emerald-600 bg-emerald-50" },
            { label: "Upcoming", value: upcomingCount, icon: RefreshCw, color: "text-blue-600 bg-blue-50" },
            { label: "Total RSVPs", value: events.reduce((s, e) => s + e.current_participants, 0), icon: Users, color: "text-violet-600 bg-violet-50" },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${k.color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">{k.value}</div>
                <div className="text-sm text-gray-500">{k.label}</div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
          </span>
          <span className="text-xs text-gray-500">Realtime sync — every change appears instantly on the public page</span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Loading events…
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No events yet</h3>
            <p className="text-gray-500 text-sm mb-6">Create your first event — it goes live on the public page instantly.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Create Event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(e => {
              const start = new Date(e.start_date)
              const isUpcoming = start >= new Date()
              return (
                <div key={e.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {e.image_url && (
                      <div className="md:w-56 h-40 md:h-auto flex-shrink-0 overflow-hidden bg-gray-50">
                        <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="flex-1 p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[e.event_type] || TYPE_COLORS.other}`}>
                          {TYPE_LABELS[e.event_type] || "Other"}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${e.is_published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {e.is_published ? "Published" : "Hidden"}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isUpcoming ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {isUpcoming ? "Upcoming" : "Past"}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold mb-1">{e.title}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {start.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                        {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>}
                        {e.is_virtual && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Virtual</span>}
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {e.current_participants}{e.max_participants ? `/${e.max_participants}` : ""} going</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => togglePublish(e)}
                          disabled={busyId === e.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          {busyId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                          {e.is_published ? "Hide" : "Publish"}
                        </button>
                        <button
                          onClick={() => openEdit(e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => deleteEvent(e)}
                          disabled={busyId === e.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                        {e.url && (
                          <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" /> Link
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">{form.id ? "Edit Event" : "Create Event"}</h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Eraser className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                  placeholder="e.g. TechPivo AI Summit 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-y"
                  placeholder="What is this event about?"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={form.event_type}
                    onChange={e => setForm({ ...form, event_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 outline-none transition-all"
                  >
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start date &amp; time *</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End date &amp; time</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 outline-none transition-all"
                    placeholder="e.g. Berlin, Germany"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Registration / Info URL</label>
                  <input
                    value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 outline-none transition-all"
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max participants</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_participants}
                    onChange={e => setForm({ ...form, max_participants: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 outline-none transition-all"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 outline-none transition-all"
                  placeholder="https://images.pexels.com/…"
                />
                {form.image_url && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 w-48 h-28">
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_virtual}
                    onChange={e => setForm({ ...form, is_virtual: e.target.checked })}
                    className="rounded border-gray-300 accent-amber-500"
                  />
                  <Globe className="h-4 w-4 text-gray-400" /> Virtual event
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={e => setForm({ ...form, is_published: e.target.checked })}
                    className="rounded border-gray-300 accent-amber-500"
                  />
                  <Eye className="h-4 w-4 text-gray-400" /> Publish immediately (visible on public page)
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveEvent}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 transition-all duration-200 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {form.id ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}