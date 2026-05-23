"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellRing } from "lucide-react"

export default function AdminPushPage() {
  const [subscriberCount, setSubscriberCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.from("push_subscriptions").select("*", { count: "exact", head: true }).then(({ count }) => {
      setSubscriberCount(count || 0)
    })
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Push Notifications</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Push Subscribers</p>
                <p className="text-3xl font-bold mt-1">{subscriberCount}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications Sent</p>
                <p className="text-3xl font-bold mt-1">0</p>
              </div>
              <BellRing className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Send Notification</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Push notifications are automatically sent when a post is published if Web Push is configured.
            Configure VAPID keys in Settings &gt; Integrations.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
