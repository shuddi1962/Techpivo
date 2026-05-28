"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#080D1A] px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "#F59E0B" }}>
            500
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Critical error
          </h1>
          <p className="text-sm mb-6" style={{ color: "#8B9EC7" }}>
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#F59E0B", color: "white", border: "none",
              padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}