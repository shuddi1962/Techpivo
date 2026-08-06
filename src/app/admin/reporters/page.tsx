"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface Profile {
  id: string
  full_name: string
  username: string
  role: string
  bio: string
  created_at: string
}

export default function AdminReportersPage() {
  const [reporters, setReporters] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newRole, setNewRole] = useState("author")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .in("role", ["author", "contributor", "editor"])
      .order("created_at", { ascending: false })
    if (data) setReporters(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const createReporter = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError("")

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        fullName: newName,
        username: newUsername || newEmail.split("@")[0],
        role: newRole,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || "Failed to create reporter")
    } else {
      setShowCreate(false)
      setNewName("")
      setNewEmail("")
      setNewPassword("")
      setNewUsername("")
      setNewRole("author")
      load()
    }
    setCreating(false)
  }

  const deleteReporter = async (id: string) => {
    if (!confirm("Delete this reporter? This action cannot be undone.")) return
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    setReporters(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reporters</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage authors, contributors, and editors</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          + Create Reporter
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Create New Reporter</h2>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">{error}</div>}
          <form onSubmit={createReporter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} required className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent bg-background" />
            <input type="text" placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent bg-background" />
            <input type="email" placeholder="Email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent bg-background" />
            <input type="password" placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent bg-background" />
            <div>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent bg-background w-full">
                <option value="author">Author</option>
                <option value="contributor">Contributor</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <div className="flex gap-3 items-end">
              <button type="submit" disabled={creating} className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                {creating ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="border rounded-lg px-4 py-2.5 text-sm hover:bg-muted transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Username</th>
                <th className="text-left p-4 font-medium">Role</th>
                <th className="text-left p-4 font-medium">Bio</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : reporters.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No reporters found.</td></tr>
              ) : reporters.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{r.full_name || "—"}</td>
                  <td className="p-4">@{r.username || "—"}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      r.role === "editor" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      r.role === "author" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>{r.role}</span>
                  </td>
                  <td className="p-4 text-muted-foreground max-w-xs truncate">{r.bio || "—"}</td>
                  <td className="p-4">
                    <button onClick={() => deleteReporter(r.id)} className="text-red-500 hover:underline text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
