"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Shield, Activity, UserPlus, Search, Mail, Calendar, Eye } from "lucide-react"
import type { Profile } from "@/types/database"

const tabs = [
  { id: "all", label: "All Users", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "invite", label: "Invite User", icon: UserPlus },
]

function AllUsersTab({ users }: { users: Profile[] }) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === "all" || u.role === roleFilter
    return matchSearch && matchRole
  })
  const roleColors: Record<string, string> = { admin: "destructive", editor: "default", author: "secondary", contributor: "outline", reporter: "outline" }
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
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No users found</p>}
      </div>
    </div>
  )
}

function RolesTab() {
  const roles = [
    { name: "Super Administrator", desc: "Complete system control", users: 1, perms: ["all"] },
    { name: "Administrator", desc: "Site management", users: 1, perms: ["posts", "users", "settings", "seo", "analytics"] },
    { name: "Editor-in-Chief", desc: "Approves publishing", users: 1, perms: ["posts.edit", "posts.publish", "comments.manage"] },
    { name: "Managing Editor", desc: "Manages editorial workflow", users: 2, perms: ["posts.edit", "posts.publish"] },
    { name: "Reporter", desc: "Creates drafts", users: 5, perms: ["posts.create", "posts.edit_own"] },
    { name: "SEO Specialist", desc: "Manages optimization", users: 2, perms: ["seo", "keywords"] },
    { name: "Social Media Manager", desc: "Publishes campaigns", users: 1, perms: ["social"] },
    { name: "Affiliate Manager", desc: "Manages affiliate links", users: 1, perms: ["affiliate"] },
  ]
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">System Roles ({roles.length})</h3>
        <Button size="sm"><Shield className="h-3 w-3 mr-1" /> Create Role</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {roles.map((r, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{r.name}</p>
                <Badge variant="outline">{r.users} user{r.users !== 1 ? 's' : ''}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{r.desc}</p>
              <div className="flex flex-wrap gap-1">
                {r.perms.map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ActivityTab() {
  const [users] = useState<Profile[]>([])
  const activities = [
    { action: "User Created", user: "newreporter@techpivo.com", time: "2 hours ago", icon: UserPlus },
    { action: "Role Changed", user: "jane@techpivo.com", time: "5 hours ago", icon: Shield },
    { action: "Password Reset", user: "bob@techpivo.com", time: "1 day ago", icon: Shield },
    { action: "Profile Updated", user: "admin@techpivo.com", time: "2 days ago", icon: Users },
    { action: "Login", user: "jane@techpivo.com", time: "2 days ago", icon: Eye },
  ]
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Recent User Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {activities.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <a.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{a.action}</p>
                <p className="text-xs text-muted-foreground">{a.user}</p>
              </div>
              <span className="text-xs text-muted-foreground">{a.time}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function InviteTab() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("reporter")
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Invite New User</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email Address</label>
            <div className="flex gap-2">
              <Input type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} className="flex-1" />
              <Button disabled={!email}><Mail className="h-4 w-4 mr-1" /> Send Invite</Button>
            </div>
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
      <Card>
        <CardHeader><CardTitle>Pending Invitations</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No pending invitations</p>
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
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500).then(({ data }) => {
      if (data) setUsers(data)
    })
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case "all": return <AllUsersTab users={users} />
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
