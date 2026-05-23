"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Share2, Globe, MessageSquare, Hash, Camera, Video, MessageCircle, BookOpen, Code2, FileText } from "lucide-react"
import { SOCIAL_PLATFORMS } from "@/lib/constants"
import type { SocialAccount } from "@/types/database"

const platformIcons: Record<string, any> = {
  twitter: MessageSquare,
  facebook: Globe,
  instagram: Camera,
  linkedin: Hash,
  telegram: MessageCircle,
  reddit: MessageSquare,
  medium: BookOpen,
  devto: Code2,
  hashnode: FileText,
  pinterest: Globe,
}

export default function AdminSocialPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [activeTab, setActiveTab] = useState("accounts")

  useEffect(() => {
    const supabase = createClient()
    supabase.from("social_accounts").select("*").order("platform").then(({ data }) => {
      if (data) setAccounts(data)
    })
  }, [])

  const toggleAutoPublish = async (id: string, value: boolean) => {
    const supabase = createClient()
    await supabase.from("social_accounts").update({ auto_publish: value }).eq("id", id)
    setAccounts(accounts.map((a) => (a.id === id ? { ...a, auto_publish: value } : a)))
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Social Media</h1>

      <Tabs defaultValue="accounts" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOCIAL_PLATFORMS.map((platform) => {
              const account = accounts.find((a) => a.platform === platform)
              const Icon = platformIcons[platform] || Share2

              return (
                <Card key={platform}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <p className="font-medium capitalize">{platform.replace("_", " ")}</p>
                          {account && <p className="text-xs text-muted-foreground">{account.account_name}</p>}
                        </div>
                      </div>
                      <Badge variant={account ? "default" : "secondary"}>
                        {account ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                    <Button variant={account ? "outline" : "default"} size="sm" className="w-full">
                      {account ? "Manage" : "Connect"}
                    </Button>
                    {account && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">Auto-publish</span>
                        <Switch checked={account.auto_publish} onCheckedChange={(v) => toggleAutoPublish(account.id, v)} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground text-center py-8">
                Social post queue. Configure accounts to start scheduling.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader><CardTitle className="text-lg">Post Templates</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Available variables: {`{title}`}, {`{excerpt_50}`}, {`{excerpt_100}`}, {`{link}`}, {`{hashtags}`}, {`{category}`}, {`{author}`}, {`{reading_time}`}
              </p>
              <div className="space-y-3">
                {SOCIAL_PLATFORMS.slice(0, 5).map((platform) => (
                  <div key={platform} className="p-3 border rounded-lg">
                    <p className="text-sm font-medium capitalize mb-2">{platform.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      Default: New post: {`{title}`} — {`{excerpt_50}`} {`{link}`} {`{hashtags}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
