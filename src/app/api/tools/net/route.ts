import { NextRequest, NextResponse } from "next/server";

const DOH_URL = "https://cloudflare-dns.com/dns-query";

const DNS_TYPES: Record<string, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  NS: 2,
  TXT: 16,
  SOA: 6,
  CAA: 257,
  PTR: 12,
  SRV: 33,
};

export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get("name") || "").trim().toLowerCase();
  const qtypeRaw = (req.nextUrl.searchParams.get("qtype") || "A").toUpperCase();
  const qtype = DNS_TYPES[qtypeRaw];

  if (!name || name.length > 253 || /[^a-z0-9.\-]/.test(name)) {
    return NextResponse.json({ error: "Invalid hostname" }, { status: 400 });
  }
  if (!qtype) {
    return NextResponse.json({ error: "Unsupported record type" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${DOH_URL}?name=${encodeURIComponent(name)}&type=${qtype}`, {
      headers: { accept: "application/dns-json" },
      signal: controller.signal,
      next: { revalidate: 120 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: `DNS provider returned ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ name: data.Question?.[0]?.name || name, type: data.Question?.[0]?.type ?? qtypeRaw, status: data.Status ?? -1, answers: data.Answer || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.name === "AbortError" ? "DNS lookup timed out" : "DNS lookup failed" }, { status: 502 });
  }
}