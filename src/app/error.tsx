"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "hsl(var(--accent))" }}>500</div>
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Something went wrong</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          An unexpected error occurred. Please try refreshing the page.
        </p>
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
      </div>
    </div>
  )
}