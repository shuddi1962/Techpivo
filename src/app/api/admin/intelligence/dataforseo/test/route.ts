import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-auth";
import { isDataForSeoConfigured, dfsUserData } from "@/lib/dataforseo";
import { DataForSeoError } from "@/lib/dataforseo/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/admin/intelligence/dataforseo/test
 * Admin-only connection probe. Returns PASS/FAIL + non-secret account
 * summary. Never exposes credentials.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request);
  if (!auth.ok) return auth.response;

  if (!isDataForSeoConfigured()) {
    return NextResponse.json(
      { status: "NOT_CONFIGURED", message: "Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in the server environment (Vercel + .env.local)." },
      { status: 200 }
    );
  }

  try {
    const { login, money } = await dfsUserData();
    return NextResponse.json({ status: "PASS", login, money });
  } catch (err) {
    if (err instanceof DataForSeoError) {
      return NextResponse.json(
        { status: "FAIL", reason: err.status, message: err.message, retryable: err.retryable },
        { status: 200 }
      );
    }
    return NextResponse.json({ status: "FAIL", reason: "unknown", message: "Probe failed." }, { status: 200 });
  }
}
