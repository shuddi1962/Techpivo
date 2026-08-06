"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Shield, Activity, UserPlus, Search, Mail, Calendar, Eye, RefreshCw } from "lucide-react"
import type { Profile } from "@/types/database"

const tabs = [
  { id: "all", label: "All Users", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "invite", label: "Invite User", icon: UserPlus },
]

function AllUsersTab({ users, onUserUpdate }: { users: Profile[]; onUserUpdate?: (id: string, updates: Partial<Profile>) => void }) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState("")
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === "all" || u.role === roleFilter
    return matchSearch && matchRole
  })
  const roleColors: Record<string, string> = { admin: "destructive", editor: "default", author: "secondary", contributor: "outline", reporter: "outline" }

  const openEdit = (user: Profile) => {
    setEditingUser(user)
    setEditName(user.full_name || "")
    setEditRole(user.role || "contributor")
  }

  const saveEdit = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ full_name: editName, role: editRole })
        .eq("id", editingUser.id)
      if (error) {
        console.error("Failed to update user:", error)
      }
    } catch (err) {
      console.error("Failed to update user:", err)
    }
    setSaving(false)
    setEditingUser(null)
    if (onUserUpdate && editingUser) {
      onUserUpdate(editingUser.id, { full_name: editName, role: editRole as UserRole })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["all", "admin", "editor", "author", "contributor", "reporter"].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${roleFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map(user => (
          <Card key={user.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{user.full_name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                {user.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={roleColors[user.role] as any}>{user.role}</Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No users found</p>}
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-lg mb-4">Edit User</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Full Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  {["admin", "editor", "author", "contributor", "reporter", "seo_specialist", "social_media_manager"].map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RolesTab() {
  const [customRoles, setCustomRoles] = useState<any[]>([])
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDesc, setNewRoleDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, profilesRes] = await Promise.all([
          supabase.from("custom_roles").select("*").order("name"),
          supabase.from("user_profiles").select("role"),
        ])

        const counts: Record<string, number> = {}
        ;(profilesRes.data || []).forEach((p: any) => {
          const r = p.role || "contributor"
          counts[r] = (counts[r] || 0) + 1
        })
        setRoleCounts(counts)

        if (rolesRes.data && rolesRes.data.length > 0) {
          setCustomRoles(rolesRes.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            desc: r.description || "",
            perms: Array.isArray(r.permissions) ? r.permissions : [],
            users: counts[r.name] || 0,
          })))
        } else {
          // No custom roles defined yet — show empty state
          setCustomRoles([])
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return
    setCreating(true)
    setError("")
    try {
      const { error: insertError } = await supabase.from("custom_roles").insert({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        permissions: [],
      })
      if (insertError) {
        setError(insertError.message)
      } else {
        setShowCreateModal(false)
        setNewRoleName("")
        setNewRoleDesc("")
        // Refresh
        const { data } = await supabase.from("custom_roles").select("*").order("name")
        if (data) {
          setCustomRoles(data.map((r: any) => ({
            id: r.id,
            name: r.name,
            desc: r.description || "",
            perms: Array.isArray(r.permissions) ? r.permissions : [],
            users: roleCounts[r.name] || 0,
          })))
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to create role")
    }
    setCreating(false)
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading roles...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Custom Roles ({customRoles.length})</h3>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Shield className="h-3 w-3 mr-1" /> Create Role
        </Button>
      </div>

      {customRoles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No custom roles defined yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Roles like &ldquo;admin&rdquo;, &ldquo;editor&rdquo;, &ldquo;author&rdquo;, and &ldquo;contributor&rdquo; are assigned via user profiles.
              Create custom roles with specific permissions here.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
              Create Your First Role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {customRoles.map((r, i) => (
            <Card key={r.id || i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{r.name}</p>
                  <Badge variant="outline">{r.users} user{r.users !== 1 ? "s" : ""}</Badge>
                </div>
                {r.desc && <p className="text-sm text-muted-foreground mb-3">{r.desc}</p>}
                <div className="flex flex-wrap gap-1">
                  {r.perms.length > 0 ? r.perms.map((p: string) => (
                    <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground">No specific permissions set</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-lg mb-4">Create Custom Role</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Role Name</label>
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Content Strategist"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description (optional)</label>
                <Input
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="e.g. Plans and schedules content campaigns"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setShowCreateModal(false); setNewRoleName(""); setNewRoleDesc(""); setError("") }}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={!newRoleName.trim() || creating}>
                {creating ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityTab() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from("audit_logs").select("action, user_email, created_at").order("created_at", { ascending: false }).limit(20)
        if (data) {
          setActivities(data.map((log: any) => ({
            action: log.action,
            user: log.user_email,
            time: formatRelativeTime(log.created_at),
            icon: log.action?.toLowerCase().includes("create") ? UserPlus : log.action?.toLowerCase().includes("role") ? Shield : log.action?.toLowerCase().includes("login") ? Eye : Activity,
          })))
        }
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, [])

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Recent User Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity found</p>
          ) : (
            activities.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <a.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{a.action?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{a.user}</p>
                </div>
                <span className="text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InviteTab() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("reporter")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const sendInvite = async () => {
    if (!email) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch("/admin/users/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", email, role }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, msg: `Invitation sent to ${email}` })
        setEmail("")
      } else {
        setResult({ ok: false, msg: data.error || "Failed to send invite" })
      }
    } catch {
      setResult({ ok: false, msg: "Network error" })
    }
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Invite New User</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email Address</label>
            <div className="flex gap-2">
              <Input type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} className="flex-1" />
              <Button disabled={!email || sending} onClick={sendInvite}>
                {sending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                {sending ? "Sending..." : "Send Invite"}
              </Button>
            </div>
            {result && (
              <p className={`text-sm mt-1 ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.msg}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Role</label>
            <div className="flex flex-wrap gap-2">
              {["admin", "editor", "reporter", "seo_specialist", "social_manager"].map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${role === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const supabase = createClient()
    supabase.from("user_profiles").select("*").order("created_at", { ascending: false }).limit(500).then(({ data }) => {
      if (data) setUsers(data)
    })
  }, [])

  const handleUserUpdate = (id: string, updates: Partial<Profile>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)))
  }

  const renderTab = () => {
    switch (activeTab) {
      case "all": return <AllUsersTab users={users} onUserUpdate={handleUserUpdate} />
      case "roles": return <RolesTab />
      case "activity": return <ActivityTab />
      case "invite": return <InviteTab />
      default: return <AllUsersTab users={users} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} registered users</p>
        </div>
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

