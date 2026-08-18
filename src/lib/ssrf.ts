/**
 * SSRF protection — blocks fetches to private/internal IP ranges.
 *
 * Use before any server-side fetch() of a URL that originated from an
 * external feed, user input, or third-party API. Validates protocol,
 * hostname, and resolved IP (best-effort via DNS lookup).
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
])

/** Private IPv4 CIDRs (RFC 1918 + loopback + link-local + metadata) */
const PRIVATE_IPV4 = [
  /^127\./,        // loopback
  /^10\./,         // private
  /^172\.(1[6-9]|2\d|3[01])\./, // private 172.16/12
  /^192\.168\./,   // private
  /^169\.254\./,   // link-local
  /^0\./,          // current network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // carrier-grade NAT
  /^192\.0\.0\./,  // IETF protocol assignments
  /^198\.(1[8-9])\./, // benchmarking
]

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (BLOCKED_HOSTS.has(h)) return true
  // IPv4 literal
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    return PRIVATE_IPV4.some((re) => re.test(h))
  }
  // IPv6 loopback / link-local
  if (/^::1$/.test(h) || /^fe[89ab]/i.test(h) || /^fc/i.test(h)) return true
  // AWS metadata host
  if (h === "169.254.169.254" || h === "metadata.google.internal") return true
  return false
}

export function isSafeUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== "http:" && u.protocol !== "https:") return false
    if (isBlockedHostname(u.hostname)) return false
    const port = u.port || (u.protocol === "https:" ? "443" : "80")
    // Block common internal ports
    if (["22", "25", "3306", "5432", "6379", "27017"].includes(port)) return false
    return true
  } catch {
    return false
  }
}
