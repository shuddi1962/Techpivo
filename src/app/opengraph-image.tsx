import { ImageResponse } from "next/og"
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants"

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#F59E0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
              color: "#0F172A",
            }}
          >
            T
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>{SITE_NAME}</div>
        </div>
        <div style={{ fontSize: 30, color: "#F59E0B", fontWeight: 600 }}>{SITE_TAGLINE}</div>
        <div style={{ fontSize: 18, color: "#94A3B8", marginTop: 16 }}>
          Tech News · Tutorials · Reviews · AI · Cybersecurity · Developer Tools
        </div>
      </div>
    ),
    { ...size }
  )
}
