import { NextResponse } from "next/server"
import { getFxRate, getFxRatesPerNgn } from "@/lib/fx"
import { FX_CURRENCY_LABELS, FX_POPULAR } from "@/lib/fx-shared"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const from = (url.searchParams.get("from") || "USD").toUpperCase()
  const to = (url.searchParams.get("to") || "NGN").toUpperCase()
  const amount = Number(url.searchParams.get("amount") || 1)

  if (url.searchParams.has("from") || url.searchParams.has("to")) {
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      return NextResponse.json({ error: "Currency codes must be 3 letters (e.g. USD, NGN)" }, { status: 400 })
    }
    const { rate, updatedAt, source } = await getFxRate(from, to)
    return NextResponse.json({
      from, to, amount: isFinite(amount) ? amount : 1,
      rate, result: isFinite(amount) ? Math.round(amount * rate * 10000) / 10000 : 0,
      updatedAt, source,
    })
  }

  const { rates, updatedAt, source } = await getFxRatesPerNgn()
  return NextResponse.json({ base: "NGN", rates, popular: FX_POPULAR, labels: FX_CURRENCY_LABELS, updatedAt, source })
}