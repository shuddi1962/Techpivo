import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "hsl(var(--accent))" }}>404</div>
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Page not found</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            background: "hsl(var(--accent))", color: "white", border: "none",
            padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600,
            textDecoration: "none", display: "inline-block", fontFamily: "'DM Sans', sans-serif"
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}