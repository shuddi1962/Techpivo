import { NextResponse } from 'next/server'

export async function GET() {
  const pageSpeed = !!process.env.PAGESPEED_API_KEY

  return NextResponse.json({
    pageSpeed,
    envCheck: {
      psKey: !!process.env.PAGESPEED_API_KEY,
    },
  })
}
