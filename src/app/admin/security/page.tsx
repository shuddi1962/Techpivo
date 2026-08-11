"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Shield, Key, FileText, Monitor, Smartphone, AlertTriangle, Lock, Settings, RefreshCw } from "lucide-react"
import { SecurityDashboard } from "@/components/admin/security-dashboard"
import { AuditLogViewer } from "@/components/admin/audit-log-viewer"
import { ApiKeyManager } from "@/components/admin/api-key-manager"

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Shield },
  { id: "sessions", label: "Sessions", icon: Monitor },
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "apikeys", label: "API Keys", icon: Key },
  { id: "audit", label: "Audit Logs", icon: FileText },
  { id: "threats", label: "Threat Detection", icon: AlertTriangle },
  { id: "roles", label: "Roles & Permissions", icon: Lock },
  { id: "settings", label: "Settings", icon: Settings },
]

function SessionsTab() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const supabase = createClient()

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth-users")
      if (!res.ok) {
        setAuthError(true)
        setSessions([])
        return
      }
      const data = await res.json()
      const now = new Date().getTime()
      setSessions((data.sessions || []).map((u: any) => ({
        user: u.email,
        device: "Browser",
        role: u.role,
        lastSignIn: u.lastSignIn,
        status: u.lastSignIn && (now - new Date(u.lastSignIn).getTime()) < 3600000 ? "active" : "idle",
      })))
      setAuthError(false)
      setLastSync(new Date())
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
      setAuthError(true)
      setSessions([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSessions()
    const channel = supabase
      .channel(`security_sessions_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_sessions" }, () => fetchSessions())
      .subscribe()
    const interval = setInterval(fetchSessions, 30000)
    const onFocus = () => fetchSessions()
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [fetchSessions, supabase])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">User Sessions ({sessions.length})</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{lastSync ? `synced ${lastSync.toLocaleTimeString()}` : "…"}</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
          </span>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : authError ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Unable to fetch auth sessions. Make sure you&apos;re signed in as an admin.</p>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No users found.</p>
          </CardContent>
        </Card>
      ) : sessions.map((s, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <div>
                <p className="font-medium">{s.user}</p>
                <p className="text-xs text-muted-foreground">{s.device} · {s.role}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{s.lastSignIn ? new Date(s.lastSignIn).toLocaleString() : "Never signed in"}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DevicesTab() {
  const supabase = createClient()
  const [data, setData] = useState<{ device: any[]; browser: any[]; os: any[]; country: any[] }>({ device: [], browser: [], os: [], country: [] })
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const [deviceRes, browserRes, osRes, countryRes] = await Promise.all([
        supabase.from("analytics_events").select("device", { count: "exact", head: false }).not("device", "is", null),
        supabase.from("analytics_events").select("browser", { count: "exact", head: false }).not("browser", "is", null),
        supabase.from("analytics_events").select("os", { count: "exact", head: false }).not("os", "is", null),
        supabase.from("analytics_events").select("country", { count: "exact", head: false }).not("country", "is", null),
      ])
      const countBy = (rows: any[], key: string) => {
        const map: Record<string, number> = {}
        ;(rows || []).forEach((r: any) => {
          const v = r[key] || "Unknown"
          map[v] = (map[v] || 0) + 1
        })
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
      }
      setData({
        device: countBy(deviceRes.data || [], "device"),
        browser: countBy(browserRes.data || [], "browser"),
        os: countBy(osRes.data || [], "os"),
        country: countBy(countryRes.data || [], "country"),
      })
      setLastSync(new Date())
    } catch (err) { console.error("Failed to fetch devices:", err) }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`security_devices_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, () => load())
      .subscribe()
    const interval = setInterval(load, 60000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, load])

  const sections: { key: keyof typeof data; title: string }[] = [
    { key: "device", title: "By Device" },
    { key: "browser", title: "By Browser" },
    { key: "os", title: "By Operating System" },
    { key: "country", title: "By Country" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Known Devices</h3>
        <span className="text-xs text-muted-foreground">{lastSync ? `synced ${lastSync.toLocaleTimeString()}` : "…"} · since tracking started 2026-08-10</span>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sections.map(({ key, title }) => (
            <Card key={key}>
              <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data[key].length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
                ) : (
                  data[key].slice(0, 8).map((row) => {
                    const max = data[key][0]?.value || 1
                    return (
                      <div key={row.name} className="flex items-center gap-2">
                        <span className="w-32 text-xs truncate">{row.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(row.value / max) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{row.value}</span>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ThreatsTab() {
  const supabase = createClient()
  const [data, setData] = useState({ events: 0, todayEvents: 0, failedLogins: 0, apiKeys: 0, activeKeys: 0, pendingComments: 0, sessions24h: 0 })
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const dayAgo = new Date(Date.now() - 86400000).toISOString()
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const [eventsRes, todayRes, loginsRes, keysRes, commentsRes, sessionsRes] = await Promise.all([
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).ilike("action", "%login%"),
        supabase.from("api_keys").select("is_active"),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("user_sessions").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      ])
      const activeKeys = (keysRes.data || []).filter((k: any) => k.is_active).length
      setData({
        events: eventsRes.count || 0,
        todayEvents: todayRes.count || 0,
        failedLogins: loginsRes.count || 0,
        apiKeys: keysRes.data?.length || 0,
        activeKeys,
        pendingComments: commentsRes.count || 0,
        sessions24h: sessionsRes.count || 0,
      })
      setLastSync(new Date())
    } catch (err) { console.error("Failed to fetch threats:", err) }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`security_threats_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "api_keys" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => load())
      .subscribe()
    const interval = setInterval(load, 30000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, load])

  const stats = [
    { label: "Audit Events (all time)", value: loading ? "..." : data.events.toLocaleString() },
    { label: "Audit Events Today", value: loading ? "..." : data.todayEvents.toLocaleString() },
    { label: "Login-Related Events", value: loading ? "..." : data.failedLogins.toLocaleString() },
    { label: "Active / Total API Keys", value: loading ? "..." : `${data.activeKeys}/${data.apiKeys}` },
    { label: "Comments Awaiting Moderation", value: loading ? "..." : data.pendingComments.toLocaleString() },
    { label: "Sessions (24h)", value: loading ? "..." : data.sessions24h.toLocaleString() },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Threat & Activity Monitoring</h3>
        <span className="text-xs text-muted-foreground">{lastSync ? `synced ${lastSync.toLocaleTimeString()}` : "…"}</span>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Failed-login and rate-limit detection requires Supabase Auth hooks; all other metrics are computed live from audit logs, API keys, comments, and sessions.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function RolesTab() {
  const supabase = createClient()
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const fetchRoles = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const [profilesRes, customRes] = await Promise.all([
        supabase.from("profiles").select("role"),
        supabase.from("custom_roles").select("name"),
      ])
      const roleMap: Record<string, number> = {}
      ;(profilesRes.data || []).forEach((p: any) => {
        const r = p.role || "user"
        roleMap[r] = (roleMap[r] || 0) + 1
      })
      const builtin = Object.entries(roleMap).map(([name, count]) => ({ name, users: count, custom: false }))
      const custom = (customRes.data || []).map((c: any) => ({ name: c.name, users: roleMap[c.name] || 0, custom: true }))
      setRoles([...builtin, ...custom])
      setLastSync(new Date())
    } catch (err) { console.error("Failed to fetch roles:", err) }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchRoles()
    const channel = supabase
      .channel(`security_roles_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchRoles(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_roles" }, () => fetchRoles(true))
      .subscribe()
    const interval = setInterval(() => fetchRoles(true), 30000)
    const onFocus = () => fetchRoles(true)
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, fetchRoles])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">System Roles</h3>
        <span className="text-xs text-muted-foreground">{lastSync ? `synced ${lastSync.toLocaleTimeString()}` : "…"}</span>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No users found yet. Role counts appear once users sign up.</p>
          </CardContent>
        </Card>
      ) : (
        roles.map((r, i) => (
          <Card key={`${r.name}-${i}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{r.name}</p>
                {r.custom && <p className="text-xs text-muted-foreground">Custom role</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.custom ? "secondary" : "outline"}>{r.users} users</Badge>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/admin/users">View</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

const securitySettingDefs = [
  { key: "security_2fa", label: "Two-Factor Authentication", desc: "Require 2FA for all admin users" },
  { key: "security_rate_limiting", label: "Rate Limiting", desc: "Limit API requests to 100/minute" },
  { key: "security_session_timeout", label: "Session Timeout", desc: "Auto-logout after 30 minutes idle" },
  { key: "security_login_notifications", label: "Login Notifications", desc: "Email admin on new login" },
]

function SettingsTab() {
  const supabase = createClient()
  const [settings, setSettings] = useState(
    securitySettingDefs.map(s => ({ ...s, enabled: false }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const loadSettings = useCallback(async () => {
    const keys = securitySettingDefs.map(s => s.key)
    const { data } = await supabase.from("site_settings").select("key, value").in("key", keys)
    if (data) {
      setSettings(prev => prev.map(s => {
        const found = data.find(d => d.key === s.key)
        return found ? { ...s, enabled: found.value === true || found.value === "true" } : s
      }))
      setLastSync(new Date())
    }
  }, [supabase])

  useEffect(() => {
    loadSettings()
    const channel = supabase
      .channel(`security_settings_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => loadSettings())
      .subscribe()
    const interval = setInterval(loadSettings, 30000)
    const onFocus = () => loadSettings()
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, loadSettings])

  const toggleSetting = async (index: number, checked: boolean) => {
    const updated = [...settings]
    updated[index].enabled = checked
    setSettings(updated)
    setSaving(true)
    setError("")
    const { error } = await supabase.from("site_settings").upsert({ key: updated[index].key, value: checked }, { onConflict: "key" })
    if (error) {
      console.error("Failed to save setting:", error)
      setError(error.message)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Security Settings</CardTitle>
            <div className="flex items-center gap-2">
              {saving && <p className="text-xs text-muted-foreground animate-pulse">Saving...</p>}
              <span className="text-xs text-muted-foreground">{lastSync ? `synced ${lastSync.toLocaleTimeString()}` : "…"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
          {settings.map((s, i) => (
            <div key={s.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <Switch
                checked={s.enabled}
                onCheckedChange={(checked) => toggleSetting(i, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState("dashboard")

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard": return <SecurityDashboard />
      case "sessions": return <SessionsTab />
      case "devices": return <DevicesTab />
      case "apikeys": return <ApiKeyManager />
      case "audit": return <AuditLogViewer />
      case "threats": return <ThreatsTab />
      case "roles": return <RolesTab />
      case "settings": return <SettingsTab />
      default: return <SecurityDashboard />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor security, sessions, threats, and access control</p>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
        </span>
      </div>
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          )
        })}
      </div>
      {renderTab()}
    </div>
  )
}
