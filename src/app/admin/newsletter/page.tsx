"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, Users, Send, Eye, MousePointerClick } from "lucide-react"
import type { Subscriber } from "@/types/database"

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0 })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("subscribers").select("*", { count: "exact", head: true }),
      supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscribers").select("*").order("subscribed_at", { ascending: false }).limit(20),
    ]).then(([totalRes, activeRes, subsRes]) => {
      setStats({ total: totalRes.count || 0, active: activeRes.count || 0 })
      if (subsRes.data) setSubscribers(subsRes.data)
    })
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Newsletter</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold mt-1">{stats.active}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-3xl font-bold mt-1">0</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {subscribers.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{sub.email}</p>
                  {sub.name && <p className="text-xs text-muted-foreground">{sub.name}</p>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(sub.subscribed_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
