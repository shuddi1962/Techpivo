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
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: users, error } = await supabase.auth.admin.listUsers()
        if (error) {
          console.error("Failed to fetch auth users:", error)
          setAuthError(true)
          setSessions([])
        } else {
          const now = new Date().getTime()
          const activeSessions = (users?.users || []).map(u => ({
            user: u.email || u.id,
            device: "Browser",
            lastSignIn: u.last_sign_in_at || u.created_at,
            status: u.last_sign_in_at && (now - new Date(u.last_sign_in_at).getTime()) < 3600000 ? "active" : "idle",
          }))
          setSessions(activeSessions)
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err)
        setAuthError(true)
        setSessions([])
      }
      setLoading(false)
    }
    fetchSessions()
  }, [supabase])

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">User Sessions ({sessions.length})</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : authError ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Connect to Supabase Auth to view active sessions. The auth admin API requires the service_role key.</p>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No active sessions found.</p>
          </CardContent>
        </Card>
      ) : sessions.map((s, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <div>
                <p className="font-medium">{s.user}</p>
                <p className="text-xs text-muted-foreground">{s.device}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{s.lastSignIn ? new Date(s.lastSignIn).toLocaleDateString() : "Unknown"}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DevicesTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Known Devices</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Device tracking is available with session monitoring. Active sessions are shown in the Sessions tab.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function ThreatsTab() {
  const supabase = createClient()
  const [data, setData] = useState({ events: 0, failedLogins: null as number | null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const { count: events } = await supabase.from("analytics_events").select("*", { count: "exact", head: true })
          .eq("event_type", "page_view")

        setData({ events: events || 0, failedLogins: null })
      } catch (err) { console.error("Failed to fetch analytics events:", err) }
      setLoading(false)
    }
    fetchThreats()
  }, [supabase])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Security monitoring requires additional configuration. Failed login tracking and rate limit detection
            are available through Supabase Auth hooks and database webhooks.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Page Views", value: loading ? "..." : data.events.toLocaleString() },
              { label: "Failed Logins", value: "—" },
              { label: "Rate Limits Triggered", value: "—" },
              { label: "Security Status", value: "Basic" },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RolesTab() {
  const supabase = createClient()
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data: profiles } = await supabase.from("profiles").select("role")
        const roleMap: Record<string, number> = {}
        ;(profiles || []).forEach((p: any) => {
          const r = p.role || "user"
          roleMap[r] = (roleMap[r] || 0) + 1
        })
        setRoles(Object.entries(roleMap).map(([name, count]) => ({ name, users: count })))
      } catch (err) { console.error("Failed to fetch roles:", err) }
      setLoading(false)
    }
    fetchRoles()
  }, [supabase])

  const defaultRoles = [
    { name: "admin", users: 0 }, { name: "editor", users: 0 },
    { name: "author", users: 0 }, { name: "contributor", users: 0 },
  ]

  const displayRoles = roles.length > 0 ? roles : defaultRoles

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">System Roles</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : (
        displayRoles.map((r, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{r.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.users} users</Badge>
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

function SettingsTab() {
  const supabase = createClient()
  const [settings, setSettings] = useState([
    { key: "security_2fa", label: "Two-Factor Authentication", desc: "Require 2FA for all admin users", enabled: false },
    { key: "security_rate_limiting", desc: "Limit API requests to 100/minute", enabled: true },
    { key: "security_session_timeout", desc: "Auto-logout after 30 minutes idle", enabled: true },
    { key: "security_login_notifications", desc: "Email admin on new login", enabled: false },
  ] as { key: string; label: string; desc: string; enabled: boolean }[])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const keys = settings.map(s => s.key)
      const { data } = await supabase.from("site_settings").select("key, value").in("key", keys)
      if (data) {
        setSettings(prev => prev.map(s => {
          const found = data.find(d => d.key === s.key)
          return found ? { ...s, enabled: found.value === true || found.value === "true" } : s
        }))
      }
    }
    loadSettings()
  }, [supabase, settings])

  const toggleSetting = async (index: number, checked: boolean) => {
    const updated = [...settings]
    updated[index].enabled = checked
    setSettings(updated)
    setSaving(true)
    await supabase.from("site_settings").upsert({ key: updated[index].key, value: checked }, { onConflict: "key" })
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Security Settings</CardTitle>
            {saving && <p className="text-xs text-muted-foreground animate-pulse">Saving...</p>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.map((s, i) => (
            <div key={s.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">{s.label || s.key.replace(/^security_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
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
      <div>
        <h1 className="text-2xl font-bold">Security Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor security, sessions, threats, and access control</p>
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

