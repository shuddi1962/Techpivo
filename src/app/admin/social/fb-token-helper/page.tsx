"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, RefreshCw, LogIn } from "lucide-react"

const FB_APP_ID = "1409956737618255"
const REDIRECT_URI = "https://developers.facebook.com/tools/explorer/callback"

export default function FbTokenHelperPage() {
  const [userToken, setUserToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace("#", "?"))
      const token = params.get("access_token")
      if (token) {
        setUserToken(token)
        setTimeout(() => exchangeToken(token), 500)
      }
    }
  }, [])

  const loginWithFacebook = () => {
    const url =
      `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${FB_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=pages_manage_posts&` +
      `response_type=token,granted_scopes`

    window.open(url, "_blank", "width=700,height=600")
  }

  const exchangeToken = async (token?: string) => {
    const t = token || userToken.trim()
    if (!t) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/admin/social/fb-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: t }),
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
          Get a Page Access Token in one click — no manual Graph API Explorer needed.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Step 1 — Log in with Facebook</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Click the button below to open Facebook&apos;s login dialog. Only the{" "}
            <code className="bg-muted px-1 rounded text-xs">pages_manage_posts</code> permission is requested.
          </p>
          <Button onClick={loginWithFacebook} size="lg" className="w-full sm:w-auto">
            <LogIn className="h-4 w-4 mr-2" />
            Login with Facebook
          </Button>
          <p className="text-xs text-muted-foreground">
            A new window will open. After authorizing, copy the token shown in the new page and paste it below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Step 2 — Paste Token &amp; Exchange</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              placeholder="EAAU... (paste the access token)"
              className="font-mono text-xs flex-1"
            />
            <Button onClick={() => exchangeToken()} disabled={loading || !userToken.trim()}>
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
          <CardHeader><CardTitle>Step 3 — Select Your Page</CardTitle></CardHeader>
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
                No pages found. The token may not have <code className="bg-muted px-1 rounded">pages_manage_posts</code> permission.
                Try the direct login button above.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Your credentials are processed server-side using your app secret. Nothing is sent to third parties.</p>
        <p>App ID: <code className="bg-muted px-1 rounded">{FB_APP_ID}</code></p>
      </div>
    </div>
  )
}
