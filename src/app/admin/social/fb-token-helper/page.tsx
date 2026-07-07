"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"

export default function FbTokenHelperPage() {
  const [userToken, setUserToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  const exchangeToken = async () => {
    if (!userToken.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/admin/social/fb-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: userToken.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Exchange failed")
      } else {
        setResult(data)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const savePageToken = async (pageAccessToken: string, pageId: string, pageName: string) => {
    setSaving(pageId)
    try {
      const res = await fetch("/api/admin/social/fb-exchange", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageAccessToken, pageId, pageName }),
      })
      const data = await res.json()
      if (data.success) {
        setResult((prev: any) => ({ ...prev, saved: pageId }))
      } else {
        alert("Failed to save: " + (data.error || "unknown"))
      }
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facebook Token Helper</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste your short-lived User Access Token below to exchange it for a Page Access Token.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Step 1 — Get a User Token</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ol className="text-sm space-y-1.5 list-decimal ml-4 text-muted-foreground">
            <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Graph API Explorer</a></li>
            <li>Select your app and your page in &quot;User or Page&quot; dropdown</li>
            <li>Add the permission: <code className="bg-muted px-1 rounded">pages_manage_posts</code></li>
            <li>Click <strong>Generate Access Token</strong> (ignore any invalid scope warnings)</li>
            <li>Copy the token and paste it below</li>
          </ol>
          <div className="flex gap-2 pt-2">
            <Input
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              placeholder="EAAU... (paste user access token)"
              className="font-mono text-xs flex-1"
            />
            <Button onClick={exchangeToken} disabled={loading || !userToken.trim()}>
              {loading ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Exchanging...</> : "Exchange"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-start gap-3 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader><CardTitle>Step 2 — Select a Page</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {result.pages?.length > 0 ? (
              result.pages.map((page: any) => (
                <div key={page.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{page.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {page.id}</p>
                    {page.access_token && (
                      <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[500px] mt-1">
                        token: {page.access_token.substring(0, 40)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {result.saved === page.id ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Saved
                      </Badge>
                    ) : (
                      page.access_token && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => savePageToken(page.access_token, page.id, page.name)}
                          disabled={saving === page.id}
                        >
                          {saving === page.id ? "Saving..." : "Save to Database"}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No pages found. Make sure your token has <code className="bg-muted px-1 rounded">pages_manage_posts</code> permission.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        <p>Your credentials are processed server-side using your app secret. Nothing is sent to third parties.</p>
      </div>
    </div>
  )
}
