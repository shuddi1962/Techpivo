"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Profile {
  id: string
  full_name: string
  username: string
  email?: string
  role: string
  created_at: string
}

export default function AdminRolesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const [profilesRes, emailRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      fetch("/api/admin/users"),
    ])
    const emailMap: Record<string, string> = (await emailRes.json()).users || {}
    if (profilesRes.data) {
      setProfiles(profilesRes.data.map((p: any) => ({ ...p, email: emailMap[p.id] || "" })))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const changeRole = async (userId: string, newRole: string) => {
    setUpdating(userId)
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId)
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p))
    setUpdating(null)
  }

  const roles = ["admin", "editor", "author", "contributor"]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <button onClick={load} className="text-sm border rounded-lg px-4 py-2 hover:bg-muted transition-colors">Refresh</button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Username</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Current Role</th>
                <th className="text-left p-4 font-medium">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : profiles.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
              ) : profiles.map((profile) => (
                <tr key={profile.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{profile.full_name || "—"}</td>
                  <td className="p-4">@{profile.username || "—"}</td>
                  <td className="p-4 text-muted-foreground">{profile.email}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      profile.role === "admin" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      profile.role === "editor" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      profile.role === "author" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={profile.role}
                      onChange={(e) => changeRole(profile.id, e.target.value)}
                      disabled={updating === profile.id}
                      className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent bg-background"
                    >
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-card border rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">Role Descriptions</h2>
        <div className="space-y-3 text-sm">
          <div><span className="font-medium text-red-600 dark:text-red-400">Admin</span> — Full access to all features, settings, and user management.</div>
          <div><span className="font-medium text-blue-600 dark:text-blue-400">Editor</span> — Can create, edit, publish, and manage posts and categories. Cannot manage users or site settings.</div>
          <div><span className="font-medium text-green-600 dark:text-green-400">Author</span> — Can create and edit their own posts. Cannot publish without review.</div>
          <div><span className="font-medium text-gray-600 dark:text-gray-400">Contributor</span> — Can submit posts for review. Limited write access.</div>
        </div>
      </div>
    </div>
  )
}
