import { NextResponse } from "next/server"
import { fetchMarketplaceTree } from "@/lib/marketplace-category-db"

export const dynamic = "force-dynamic"

// GET /api/marketplace/categories — the live category tree (admin-editable).
// Public on purpose: it powers the storefront department menu.
export async function GET() {
  try {
    const tree = await fetchMarketplaceTree()
    return NextResponse.json({ tree })
  } catch {
    return NextResponse.json({ tree: [] })
  }
}
