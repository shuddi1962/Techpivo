"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"

const FB_APP_ID = "1409956737618255"

declare global {
  interface Window {
    FB?: any
    fbAsyncInit?: () => void
  }
}

export default function FbTokenHelperPage() {
  const [userToken, setUserToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [grantedScopes, setGrantedScopes] = useState("")
  const initDone = useRef(false)

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    // Load FB SDK
    const script = document.createElement("script")
    script.src = "https://connect.facebook.net/en_US/sdk.js"
    script.onload = () => {
      if (window.FB) {
        window.FB.init({
          appId: FB_APP_ID,
          version: "v19.0",
          status: true,
          xfbml: false,
        })
        setSdkReady(true)
      }
    }
    document.body.appendChild(script)

    // Also check URL hash for token
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
    if (!window.FB || !sdkReady) {
      setError("Facebook SDK not loaded yet. Please wait a moment and try again.")
      return
    }
    setLoginLoading(true)
    setError("")

    window.FB.login(
      (response: any) => {
        setLoginLoading(false)
        if (response.status === "connected" && response.authResponse?.accessToken) {
          setUserToken(response.authResponse.accessToken)
          setGrantedScopes(response.authResponse.grantedScopes || "")
          exchangeToken(response.authResponse.accessToken)
        } else if (response.status === "not_authorized") {
          setError("You declined the authorization. Please try again and accept the permissions.")
        } else {
          setError("Login failed or was cancelled. Status: " + (response.status || "unknown"))
        }
      },
      { scope: "instagram_basic,instagram_content_publish", return_scopes: true }
    )
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
        <h1 className="text-2xl font-bold">Facebook Token Helper</h1>
        <p className="text-sm text-muted-foreground mt-1">
           Get Instagram &amp; Facebook tokens. Post to Instagram, cross-post to Facebook automatically.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Step 1 — Log in with Facebook</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Click the button below. Facebook will open a popup asking for
            Instagram permissions (<code className="bg-muted px-1 rounded text-xs">instagram_basic</code> + <code className="bg-muted px-1 rounded text-xs">instagram_content_publish</code>).
          </p>
          <Button
            onClick={loginWithFacebook}
            disabled={loginLoading || !sdkReady}
            size="lg"
            className="w-full sm:w-auto"
          >
            {loginLoading ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Logging in...</>
            ) : !sdkReady ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading SDK...</>
            ) : (
              <><svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Login with Facebook</>
            )}
          </Button>
          {!sdkReady && (
            <p className="text-xs text-amber-600">Loading Facebook SDK... please wait.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Step 2 — Or Paste Token Manually</CardTitle></CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-start gap-3 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm whitespace-pre-wrap">{error}</div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card>
            <CardHeader><CardTitle>Step 3a — Instagram Business Accounts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const igPages = (result.pages || []).filter((p: any) => p.instagram_business_account)
                return igPages.length > 0 ? (
                  igPages.map((page: any) => {
                    const ig = page.instagram_business_account
                    return (
                      <div key={ig.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-pink-200">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {ig.username || ig.name || "Instagram"}
                            <Badge className="bg-pink-100 text-pink-700">Instagram</Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">IG ID: {ig.id} · linked to: {page.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[500px] mt-1">
                            page token: {page.access_token?.substring(0, 40)}...
                          </p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => savePageToken(page.access_token, ig.id, ig.username || ig.id, { instagramUserId: ig.id, platform: 'instagram' })}
                          disabled={saving === ig.id}
                        >
                          {saving === ig.id ? "Saving..." : "Save Instagram → DB"}
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No Instagram accounts found linked to your pages.
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Step 3b — Facebook Pages</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.pages?.length > 0 ? (
                result.pages.map((page: any) => (
                  <div key={page.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{page.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {page.id}</p>
                      {page.instagram_business_account && (
                        <p className="text-xs text-pink-600">IG: {page.instagram_business_account.username || page.instagram_business_account.id}</p>
                      )}
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
                            {saving === page.id ? "Saving..." : "Save Facebook → DB"}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No pages found. Your token needs <code className="bg-muted px-1 rounded">pages_manage_posts</code> permission.
                </div>
              )}
            </CardContent>
          </Card>

          {grantedScopes && (
            <Card>
              <CardContent className="p-3 text-xs text-muted-foreground">
                Granted scopes: <code className="bg-muted px-1 rounded">{grantedScopes}</code>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Your Facebook login popup must not be blocked by your browser.</p>
      </div>
    </div>
  )
}
