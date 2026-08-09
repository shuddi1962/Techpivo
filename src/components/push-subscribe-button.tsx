"use client"

import { useEffect, useState } from "react"

type PushState = "loading" | "supported" | "unsupported" | "denied" | "subscribed"

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function PushSubscribeButton() {
  const [state, setState] = useState<PushState>("loading")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setState("unsupported")
        return
      }
      try {
        await navigator.serviceWorker.register("/sw.js")
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled) setState(sub ? "subscribed" : "supported")
      } catch {
        if (!cancelled) setState("unsupported")
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const subscribe = async () => {
    setBusy(true)
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setState("unsupported")
        return
      }
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState("denied")
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      })
      setState("subscribed")
    } catch {
      setState("unsupported")
    } finally {
      setBusy(false)
    }
  }

  const unsubscribe = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState("supported")
    } catch {
      // keep current state
    } finally {
      setBusy(false)
    }
  }

  if (state === "loading") return null
  if (state === "unsupported") return null

  return (
    <button
      className="icon-btn push-sub-btn"
      onClick={() => (state === "subscribed" ? unsubscribe() : subscribe())}
      disabled={busy || state === "denied"}
      title={
        state === "subscribed"
          ? "Push notifications on — click to turn off"
          : state === "denied"
            ? "Notifications blocked in your browser settings"
            : "Enable push notifications"
      }
      aria-label="Push notifications"
      style={state === "subscribed" ? { color: "var(--primary)" } : undefined}
    >
      {state === "subscribed" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6v-5a6 6 0 0 0-4.5-5.82V4.5a1.5 1.5 0 0 0-3 0v.68A6 6 0 0 0 6 11v5l-2 2v1h16v-1z"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      )}
    </button>
  )
}
