"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Profile } from "@/types/database"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setUsers(data)
    })
  }, [])

  const roleColors: Record<string, string> = {
    admin: "default",
    editor: "indigo",
    author: "secondary",
    contributor: "outline",
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users</h1>

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{user.full_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
              <Badge variant={roleColors[user.role] as any}>{user.role}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
