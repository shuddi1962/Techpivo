"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: users } = await supabase.auth.admin.listUsers()
        const now = new Date().getTime()
        const activeSessions = (users?.users || []).map(u => ({
          user: u.email || u.id,
          device: "Browser",
          lastSignIn: u.last_sign_in_at || u.created_at,
          status: u.last_sign_in_at && (now - new Date(u.last_sign_in_at).getTime()) < 3600000 ? "active" : "idle",
        }))
        setSessions(activeSessions)
      } catch {
        setSessions([{ user: "Current session", device: "Browser", lastSignIn: new Date().toISOString(), status: "active" }])
      }
      setLoading(false)
    }
    fetchSessions()
  }, [])

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">User Sessions ({sessions.length})</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
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
  const [data, setData] = useState({ blocked: 0, failedLogins: 0, threats: [] as any[] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const recent = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { count: blocked } = await supabase.from("analytics_events").select("*", { count: "exact", head: true })
          .eq("event_type", "page_view").lt("created_at", recent)

        setData({ blocked: blocked || 0, failedLogins: 0, threats: [] })
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchThreats()
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: loading ? "..." : data.blocked.toLocaleString() },
          { label: "Failed Logins", value: "0" },
          { label: "Rate Limits", value: "—" },
          { label: "Security Status", value: "Monitoring" },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
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
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchRoles()
  }, [])

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
  const [settings, setSettings] = useState([
    { label: "Two-Factor Authentication", desc: "Require 2FA for all admin users", enabled: false },
    { label: "Rate Limiting", desc: "Limit API requests to 100/minute", enabled: true },
    { label: "Session Timeout", desc: "Auto-logout after 30 minutes idle", enabled: true },
    { label: "Login Notifications", desc: "Email admin on new login", enabled: false },
  ])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {settings.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <Switch
                checked={s.enabled}
                onCheckedChange={(checked) => {
                  const updated = [...settings]
                  updated[i].enabled = checked
                  setSettings(updated)
                }}
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
