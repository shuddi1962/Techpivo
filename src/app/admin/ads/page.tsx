"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DollarSign, Plus } from "lucide-react"
import { AD_POSITIONS } from "@/lib/constants"
import type { Ad } from "@/types/database"

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [name, setName] = useState("")
  const [position, setPosition] = useState("")
  const [adCode, setAdCode] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.from("ads").select("*").order("name").then(({ data }) => {
      if (data) setAds(data)
    })
  }, [])

  const addAd = async () => {
    if (!name || !position) return
    const supabase = createClient()
    await supabase.from("ads").insert({ name, position: position as any, ad_code: adCode })
    setName("")
    setPosition("")
    setAdCode("")
    const { data } = await supabase.from("ads").select("*").order("name")
    if (data) setAds(data)
  }

  const toggleActive = async (id: string, active: boolean) => {
    const supabase = createClient()
    await supabase.from("ads").update({ is_active: active }).eq("id", id)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Ad Manager</h1>

      <Card className="mb-8">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="h-4 w-4" />New Ad Slot</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad name" />
            <select value={position} onChange={(e) => setPosition(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select position...</option>
              {Object.entries(AD_POSITIONS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <Button onClick={addAd}>Add Slot</Button>
          </div>
          <Input value={adCode} onChange={(e) => setAdCode(e.target.value)} placeholder="Ad code (HTML/JS)" className="mt-3 font-mono text-sm" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map((ad) => (
          <Card key={ad.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{ad.name}</p>
                <Switch checked={ad.is_active} onCheckedChange={(v) => toggleActive(ad.id, v)} />
              </div>
              <Badge variant="secondary">{AD_POSITIONS[ad.position as keyof typeof AD_POSITIONS] || ad.position}</Badge>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{ad.impressions} impressions</span>
                <span>{ad.clicks} clicks</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
