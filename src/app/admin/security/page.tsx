"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Key, FileText, Monitor, Smartphone, AlertTriangle, Lock, Settings } from "lucide-react"
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
  const sessions = [
    { user: "Admin User", device: "Chrome on Windows", ip: "192.168.1.1", lastActive: "2 min ago", status: "active" },
    { user: "Editor Jane", device: "Safari on macOS", ip: "10.0.0.45", lastActive: "15 min ago", status: "active" },
    { user: "Reporter Bob", device: "Firefox on Linux", ip: "172.16.0.12", lastActive: "1 hour ago", status: "idle" },
    { user: "Admin User", device: "Mobile App", ip: "192.168.1.5", lastActive: "3 hours ago", status: "active" },
  ]
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Active Sessions ({sessions.length})</h3>
        <Button variant="outline" size="sm">Revoke All Other Sessions</Button>
      </div>
      {sessions.map((s, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <div>
                <p className="font-medium">{s.user}</p>
                <p className="text-xs text-muted-foreground">{s.device} · {s.ip}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
              <p className="text-xs text-muted-foreground mt-1">{s.lastActive}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DevicesTab() {
  const devices = [
    { name: "Windows Desktop", browser: "Chrome 126", lastSeen: "Now", os: "Windows 11" },
    { name: "MacBook Pro", browser: "Safari 19", lastSeen: "15 min ago", os: "macOS Sequoia" },
    { name: "iPhone 16", browser: "Safari Mobile", lastSeen: "2 hours ago", os: "iOS 20" },
    { name: "Linux Workstation", browser: "Firefox 128", lastSeen: "1 day ago", os: "Ubuntu 24.04" },
  ]
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Known Devices</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {devices.map((d, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.browser} · {d.os}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{d.lastSeen}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ThreatsTab() {
  const threats = [
    { type: "Rate Limit", detail: "IP 45.33.32.156 hit rate limit 12 times", severity: "medium", time: "10 min ago" },
    { type: "Failed Login", detail: "3 failed attempts for admin@techpivo.com", severity: "high", time: "1 hour ago" },
    { type: "Suspicious Bot", detail: "Unknown crawler accessing /admin/* paths", severity: "high", time: "3 hours ago" },
    { type: "SQL Injection Attempt", detail: "Blocked suspicious query from 203.0.113.42", severity: "critical", time: "6 hours ago" },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: "Threats Blocked", value: "142" }, { label: "Failed Logins", value: "23" }, { label: "Rate Limits Hit", value: "8" }, { label: "Last Incident", value: "6h ago" }].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Threats</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {threats.map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">{t.type}</p>
                <p className="text-xs text-muted-foreground">{t.detail}</p>
              </div>
              <div className="text-right">
                <Badge variant={t.severity === 'critical' ? 'destructive' : t.severity === 'high' ? 'destructive' : 'secondary'}>{t.severity}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{t.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function RolesTab() {
  const roles = [
    { name: "Super Admin", users: 1, permissions: "Full access" },
    { name: "Admin", users: 1, permissions: "Site management" },
    { name: "Editor", users: 3, permissions: "Content editing & publishing" },
    { name: "Reporter", users: 5, permissions: "Create drafts" },
    { name: "SEO Specialist", users: 2, permissions: "SEO management" },
    { name: "Social Media Manager", users: 1, permissions: "Social publishing" },
  ]
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">System Roles</h3>
        <Button size="sm">Add Role</Button>
      </div>
      {roles.map((r, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.permissions}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{r.users} users</Badge>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SettingsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Two-Factor Authentication", desc: "Require 2FA for all admin users", enabled: true },
            { label: "Rate Limiting", desc: "Limit API requests to 100/minute", enabled: true },
            { label: "IP Blocking", desc: "Auto-block IPs after 10 failed attempts", enabled: true },
            { label: "Bot Protection", desc: "Block known malicious bots", enabled: true },
            { label: "Session Timeout", desc: "Auto-logout after 30 minutes idle", enabled: false },
            { label: "Login Notifications", desc: "Email admin on new login", enabled: true },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <div className={`w-10 h-5 rounded-full flex items-center cursor-pointer ${s.enabled ? 'bg-primary justify-end' : 'bg-muted justify-start'}`}>
                <div className="w-4 h-4 bg-white rounded-full m-0.5" />
              </div>
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
