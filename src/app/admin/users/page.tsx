"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Shield, Activity, UserPlus, Search, Mail, Calendar, Eye, RefreshCw, Trash2, Pencil } from "lucide-react"
import type { Profile } from "@/types/database"

const tabs = [
  { id: "all", label: "All Users", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "invite", label: "Invite User", icon: UserPlus },
]

const ROLE_PERMISSIONS = [
  "read", "write", "publish", "schedule",
  "manage_media", "manage_comments", "manage_seo", "manage_analytics",
  "manage_users", "manage_settings", "manage_ads", "manage_affiliate",
  "manage_social", "manage_newsletter",
]

function AllUsersTab({ users, onUserUpdate, onUserDelete }: { users: Profile[]; onUserUpdate?: (id: string, updates: Partial<Profile>) => void; onUserDelete?: (id: string) => void }) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState("")
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selfId, setSelfId] = useState("")
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setSelfId(data.user.id) })
  }, [supabase])

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
    setEditError("")
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: editName, role: editRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || "Failed to update user")
        return
      }
      if (onUserUpdate && editingUser) {
        onUserUpdate(editingUser.id, { full_name: editName, role: editRole as UserRole })
      }
      setEditingUser(null)
    } catch (err) {
      console.error("Failed to update user:", err)
      setEditError("Network error — please try again")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: Profile) => {
    if (user.id === selfId) {
      setEditError("You cannot delete your own account")
      return
    }
    if (!window.confirm(`Delete ${user.full_name || user.username || "this user"}? This permanently removes the account and all linked data.`)) return
    setDeletingId(user.id)
    setEditError("")
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || "Failed to delete user")
        return
      }
      if (onUserDelete) onUserDelete(user.id)
    } catch (err) {
      console.error("Failed to delete user:", err)
      setEditError("Network error — please try again")
    } finally {
      setDeletingId(null)
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(user)}
                  disabled={deletingId === user.id || user.id === selfId}
                  title={user.id === selfId ? "You cannot delete your own account" : "Delete user"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
              {editError && <p className="text-sm text-red-600">{editError}</p>}
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
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; role: any }>(null)
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, profilesRes] = await Promise.all([
          supabase.from("custom_roles").select("*").order("name"),
          supabase.from("profiles").select("role"),
        ])

        const counts: Record<string, number> = {}
        ;(profilesRes.data || []).forEach((p: any) => {
          const r = p.role || "contributor"
          counts[r] = (counts[r] || 0) + 1
        })
        setRoleCounts(counts)

        setCustomRoles((rolesRes.data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          desc: r.description || "",
          perms: Array.isArray(r.permissions) ? r.permissions : [],
          users: counts[r.name] || 0,
        })))
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchData()
    const channel = supabase
      .channel(`users_roles_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_roles" }, () => fetchData())
      .subscribe()
    const interval = setInterval(fetchData, 30000)
    const onFocus = () => fetchData()
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase])

  const openCreate = () => {
    setModal({ mode: "create" })
    setFormName("")
    setFormDesc("")
    setError("")
  }

  const openEdit = (role: any) => {
    setModal({ mode: "edit", role })
    setFormName(role.name)
    setFormDesc(role.desc)
    setError("")
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    setError("")
    try {
      if (modal?.mode === "create") {
        const { error: insertError } = await supabase.from("custom_roles").insert({
          name: formName.trim(),
          description: formDesc.trim(),
          permissions: [],
        })
        if (insertError) setError(insertError.message)
        else setModal(null)
      } else if (modal?.mode === "edit" && modal.role) {
        const { error: updateError } = await supabase
          .from("custom_roles")
          .update({ name: formName.trim(), description: formDesc.trim() })
          .eq("id", modal.role.id)
        if (updateError) setError(updateError.message)
        else setModal(null)
      }
    } catch (e: any) {
      setError(e.message || "Failed to save role")
    }
    setSaving(false)
  }

  const togglePermission = async (role: any, perm: string) => {
    const perms = role.perms.includes(perm)
      ? role.perms.filter((p: string) => p !== perm)
      : [...role.perms, perm]
    setCustomRoles(prev => prev.map(r => r.id === role.id ? { ...r, perms } : r))
    const { error: updateError } = await supabase
      .from("custom_roles")
      .update({ permissions: perms })
      .eq("id", role.id)
    if (updateError) console.error("Failed to update permissions:", updateError.message)
  }

  const handleDelete = async (role: any) => {
    if (!window.confirm(`Delete custom role "${role.name}"? Users assigned to it keep their base profile role.`)) return
    setDeletingId(role.id)
    setError("")
    try {
      const { error: deleteError } = await supabase.from("custom_roles").delete().eq("id", role.id)
      if (deleteError) setError(deleteError.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading roles...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Custom Roles ({customRoles.length})</h3>
        <Button size="sm" onClick={openCreate}>
          <Shield className="h-3 w-3 mr-1" /> Create Role
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Built-in roles</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {["admin", "editor", "author", "contributor", "reporter", "seo_specialist", "social_media_manager"].map(r => (
            <Badge key={r} variant="outline" className="text-xs">
              {r.replace(/_/g, " ")} — {roleCounts[r] || 0}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {customRoles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No custom roles defined yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create custom roles with fine-grained permissions — tick permissions on each role card to grant or revoke instantly.
            </p>
            <Button size="sm" className="mt-4" onClick={openCreate}>
              Create Your First Role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {customRoles.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-medium">{r.name}</p>
                    {r.desc && <p className="text-xs text-muted-foreground truncate">{r.desc}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline">{r.users} user{r.users !== 1 ? "s" : ""}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-3">
                  {ROLE_PERMISSIONS.map(p => (
                    <label key={p} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={r.perms.includes(p)}
                        onChange={() => togglePermission(r, p)}
                        className="h-3.5 w-3.5 rounded border-input"
                      />
                      <span className={r.perms.includes(p) ? "text-foreground" : "text-muted-foreground"}>
                        {p.replace(/_/g, " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-lg mb-4">
              {modal.mode === "create" ? "Create Custom Role" : "Edit Role"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Role Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Content Strategist"
                  disabled={modal.mode === "edit"}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description (optional)</label>
                <Input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Plans and schedules content campaigns"
                />
              </div>
              {modal.mode === "edit" && (
                <p className="text-xs text-muted-foreground">
                  Permissions can be toggled directly on the role card after saving.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formName.trim() || saving}>
                {saving ? "Saving..." : "Save"}
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
  const [emailMap, setEmailMap] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const [auditRes, emailRes] = await Promise.all([
        supabase.from("audit_logs").select("action, user_id, entity_type, details, created_at").order("created_at", { ascending: false }).limit(20),
        fetch("/api/admin/users"),
      ])
      const map: Record<string, string> = emailRes.ok ? ((await emailRes.json()).users as Record<string, string>) || {} : {}
      setEmailMap(map)
      if (auditRes.data) {
        setActivities((auditRes.data as any[]).map((log) => ({
          action: log.action,
          user: map[log.user_id] || log.user_id?.slice(0, 8) || "System",
          time: formatRelativeTime(log.created_at),
          icon: log.action?.toLowerCase().includes("create") ? UserPlus : log.action?.toLowerCase().includes("role") ? Shield : log.action?.toLowerCase().includes("login") ? Eye : Activity,
        })))
      }
    } catch { /* ignore */ }
    setLoading(false)
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

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    return () => { clearInterval(interval); window.removeEventListener("focus", onFocus) }
  }, [load])

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
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const supabase = createClient()

  const loadUsers = useCallback(async (quiet = false) => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500)
    if (data) {
      setUsers(data)
      setLastSync(new Date())
    }
  }, [supabase])

  useEffect(() => {
    loadUsers()
    const channel = supabase
      .channel(`admin_users_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, () => loadUsers(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadUsers(true))
      .subscribe()
    const interval = setInterval(() => loadUsers(true), 30000)
    const onFocus = () => loadUsers(true)
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, loadUsers])

  const handleUserUpdate = (id: string, updates: Partial<Profile>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)))
  }

  const handleUserDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const renderTab = () => {
    switch (activeTab) {
      case "all": return <AllUsersTab users={users} onUserUpdate={handleUserUpdate} onUserDelete={handleUserDelete} />
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
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} registered users · {lastSync ? `synced ${lastSync.toLocaleTimeString()}` : "…"}
          </p>
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

