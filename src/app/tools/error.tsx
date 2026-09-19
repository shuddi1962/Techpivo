"use client"

import { useEffect } from "react"

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Tools Error]", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="text-center max-w-lg">
        <div className="text-6xl mb-4" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "hsl(var(--accent))" }}>500</div>
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Tools page error</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          A client-side error occurred while loading the tools page.
        </p>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs font-mono text-red-700 dark:text-red-300 break-all">
            {error.message || "Unknown error"}
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-red-500 mt-2">
              Digest: {error.digest}
            </p>
          )}
          {error.stack && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">Stack trace</summary>
              <pre className="text-[10px] font-mono text-red-600/80 dark:text-red-400/80 mt-1 whitespace-pre-wrap break-all max-h-48 overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            style={{
              background: "hsl(var(--accent))", color: "white", border: "none",
              padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
            }}
          >
            Try Again
          </button>
          <a
            href="/tools"
            style={{
              background: "transparent", color: "hsl(var(--accent))", border: "1px solid hsl(var(--accent))",
              padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "none"
            }}
          >
            Back to Tools
          </a>
        </div>
      </div>
    </div>
  )
}
