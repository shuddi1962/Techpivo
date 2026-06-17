import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { width: string; height: string } }
) {
  const w = Math.min(Math.max(parseInt(params.width) || 400, 1), 1920)
  const h = Math.min(Math.max(parseInt(params.height) || 300, 1), 1080)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#1e293b"/>
    <rect x="${w*0.1}" y="${h*0.1}" width="${w*0.8}" height="${h*0.8}" rx="12" fill="#334155"/>
    <text x="${w/2}" y="${h/2}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="${Math.min(w,h)*0.08}" font-weight="600" fill="#64748b">Techpivo</text>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
