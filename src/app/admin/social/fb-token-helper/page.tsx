"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, RefreshCw, ExternalLink } from "lucide-react"

const FB_APP_ID = "1409956737618255"

export default function FbTokenHelperPage() {
  const [userToken, setUserToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  // Auto-detect token from URL hash (redirected back from Facebook OAuth)
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace("#", "?"))
      const token = params.get("access_token")
      if (token) {
        setUserToken(token)
        window.location.hash = ""
        setTimeout(() => exchangeToken(token), 500)
      }
    }
  }, [])

  // Redirect the main window to Facebook OAuth (most reliable, no SDK needed)
  const redirectToFacebook = () => {
    const redirectUri = window.location.href.split("#")[0].split("?")[0]
    const url =
      `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${FB_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=instagram_basic,instagram_content_publish&` +
      `response_type=token`
    window.location.href = url
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

  const savePageToken = async (pageAccessToken: string, pageId: string, pageName: string, extra: Record<string, any> = {}) => {
    const id = extra?.instagramUserId || pageId
    setSaving(id)
    try {
      const res = await fetch("/api/admin/social/fb-exchange", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageAccessToken, pageId, pageName, ...extra }),
      })
      const data = await res.json()
      if (data.success) {
        setResult((prev: any) => ({ ...prev, saved: id }))
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
        <h1 className="text-2xl font-bold">Instagram &amp; Facebook Token Helper</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Post to Instagram, cross-post to Facebook automatically.
        </p>
      </div>

      {/* ── STEP 1: AUTH ── */}
      <Card>
        <CardHeader><CardTitle>Step 1 — Connect with Facebook</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Grant <strong>instagram_basic</strong> and <strong>instagram_content_publish</strong> permissions.
          </p>

          <p className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
            Clicking the button below will redirect you to Facebook for authorization.
            After you approve, you&apos;ll be sent back here and the token is captured automatically.
          </p>

          <Button onClick={redirectToFacebook} size="lg" className="w-full sm:w-auto bg-[#1877F2] hover:bg-[#166FE5] text-white">
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Connect with Facebook
          </Button>
        </CardContent>
      </Card>

      {/* ── STEP 2: MANUAL / EXCHANGE ── */}
      <Card>
        <CardHeader><CardTitle>Step 2 — Or Paste an Access Token</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            If the redirect doesn&apos;t work, get a token from the{" "}
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Graph API Explorer</a>
            {" "}with <code className="bg-muted px-1 rounded text-[10px]">instagram_basic</code> +{" "}
            <code className="bg-muted px-1 rounded text-[10px]">instagram_content_publish</code> and paste it below.
          </p>
          <div className="flex gap-2">
            <Input
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              placeholder="EAAU... (paste access token)"
              className="font-mono text-xs flex-1"
            />
            <Button onClick={() => exchangeToken()} disabled={loading || !userToken.trim()}>
              {loading ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Exchanging...</> : "Exchange"}
            </Button>
          </div>
          {userToken && (
            <p className="text-xs text-muted-foreground truncate">
              Token: {userToken.substring(0, 50)}...
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── ERROR ── */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-start gap-3 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm whitespace-pre-wrap">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* ── RESULTS ── */}
      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Step 3a — Instagram Business Accounts
                <Badge className="bg-pink-100 text-pink-700 text-xs">Instagram</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const igPages = (result.pages || []).filter((p: any) => p.instagram_business_account)
                return igPages.length > 0 ? (
                  igPages.map((page: any) => {
                    const ig = page.instagram_business_account
                    return (
                      <div key={ig.id} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {ig.username || ig.name || "Instagram Account"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            IG ID: {ig.id} · Linked to Facebook Page: <strong>{page.name}</strong>
                          </p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                          onClick={() => savePageToken(page.access_token, ig.id, ig.username || ig.id, { instagramUserId: ig.id, platform: 'instagram' })}
                          disabled={saving === ig.id}
                        >
                          {saving === ig.id ? (
                            "Saving..."
                          ) : result.saved === ig.id ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Saved</>
                          ) : (
                            "Save Instagram → DB"
                          )}
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
                    No Instagram Business Accounts linked to your Facebook Pages.
                    Make sure your Instagram account is a <strong>Business Account</strong>
                    {" "}and linked to a Facebook Page you manage.
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Step 3b — Facebook Pages
                <Badge className="bg-blue-100 text-blue-700 text-xs">Facebook</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.pages?.length > 0 ? (
                result.pages.map((page: any) => (
                  <div key={page.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{page.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {page.id}</p>
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
                            {saving === page.id ? "Saving..." : "Save Facebook → DB"}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
                  No Facebook pages found. Your token may need the <code className="bg-muted px-1 rounded text-xs">pages_manage_posts</code> permission.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Facebook App ID: {FB_APP_ID}</p>
        <p>After saving, go to <strong>Admin → Integrations</strong> to verify.</p>
      </div>
    </div>
  )
}
