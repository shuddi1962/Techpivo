// Shared report generation for the Report Center (client page + cron route).
// Works with any supabase client (browser admin session or service-role).

export type ReportId = "daily" | "weekly" | "monthly" | "seo" | "revenue" | "audience"

export const REPORT_TYPES: { id: ReportId; name: string; description: string; frequency: string }[] = [
  { id: "daily", name: "Daily Summary", description: "Traffic, publishing activity, and key events from the past 24 hours", frequency: "Daily" },
  { id: "weekly", name: "Weekly Performance", description: "Traffic trends, top content, SEO changes, and revenue for the past 7 days", frequency: "Weekly" },
  { id: "monthly", name: "Monthly Executive Report", description: "Comprehensive overview including traffic, revenue, content, SEO, and growth metrics", frequency: "Monthly" },
  { id: "seo", name: "SEO Health Report", description: "Rankings, indexing status, technical issues, and content optimization score", frequency: "Weekly" },
  { id: "revenue", name: "Revenue Report", description: "Ad revenue, affiliate earnings, RPM trends, and monetization recommendations", frequency: "Monthly" },
  { id: "audience", name: "Audience Report", description: "User demographics, engagement metrics, and growth trends", frequency: "Monthly" },
]

const fmtMoney = (n: number) => `$${n.toFixed(2)}`
const label = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function zeroFilledSeries(days: number) {
  const arr: { date: string; views: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    arr.push({ date: label(d), views: 0 })
  }
  return arr
}

function countSessions(rows: any[]): number {
  const set = new Set<string>()
  let nulls = 0
  rows.forEach((r) => { if (r.session_id) set.add(r.session_id); else nulls++ })
  return set.size + nulls
}

export async function fetchReportData(supabase: any, reportId: ReportId): Promise<Record<string, any>> {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
  const days = reportId === "daily" ? 1 : reportId === "weekly" ? 7 : 30
  const since = isoDaysAgo(days)
  const prevSince = isoDaysAgo(days * 2)

  const count = async (table: string, filters: any[]) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true })
    filters.forEach((f) => { q = q[f[0]](f[1], f[2]) })
    const res = await q
    return res.count || 0
  }

  const base: Record<string, any> = {
    generatedAt: new Date().toISOString(),
    period: reportId === "daily" ? "Last 24 hours" : `Last ${days} days`,
  }

  if (reportId === "daily") {
    const [postsPublished, viewsToday, sessionsToday, commentsToday, newSubscribers, pageRes] = await Promise.all([
      count("posts", [["eq", "status", "published"], ["gte", "created_at", todayStart]]),
      count("analytics_events", [["eq", "event_type", "page_view"], ["gte", "created_at", todayStart]]),
      count("analytics_events", [["eq", "event_type", "page_view"], ["gte", "created_at", todayStart]]),
      count("comments", [["gte", "created_at", todayStart]]),
      count("subscribers", [["gte", "subscribed_at", todayStart]]),
      supabase.from("analytics_events").select("page_url").eq("event_type", "page_view").gte("created_at", todayStart).limit(2000),
    ])
    const pageMap: Record<string, number> = {}
    ;(pageRes.data || []).forEach((e: any) => { const u = e.page_url || "/"; pageMap[u] = (pageMap[u] || 0) + 1 })
    return {
      ...base,
      postsPublished, viewsToday, sessionsToday: sessionsToday, commentsToday, newSubscribers,
      topPages: Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, views]) => ({ page, views })),
    }
  }

  if (reportId === "weekly" || reportId === "monthly") {
    const [postsPublished, views, prevViews, newSubscribers, adRevenue, affiliateRevenue, seoAvgRes, seoIssuesOpen, pageRes, sessionRes, seriesRes] = await Promise.all([
      count("posts", [["eq", "status", "published"], ["gte", "created_at", since]]),
      count("analytics_events", [["eq", "event_type", "page_view"], ["gte", "created_at", since]]),
      count("analytics_events", [["eq", "event_type", "page_view"], ["gte", "created_at", prevSince], ["lt", "created_at", since]]),
      count("subscribers", [["gte", "subscribed_at", since]]),
      (async () => {
        const { data } = await supabase.from("ad_revenue").select("revenue").gte("date", since.slice(0, 10))
        return (data || []).reduce((s: number, r: any) => s + (Number(r.revenue) || 0), 0)
      })(),
      (async () => {
        const { data } = await supabase.from("affiliate_sales").select("commission").gte("converted_at", since)
        return (data || []).reduce((s: number, r: any) => s + (Number(r.commission) || 0), 0)
      })(),
      supabase.from("seo_audits").select("overall_score").limit(1000),
      count("seo_issues", [["eq", "resolved", false]]),
      supabase.from("analytics_events").select("page_url").eq("event_type", "page_view").gte("created_at", since).limit(5000),
      supabase.from("analytics_events").select("session_id").eq("event_type", "page_view").gte("created_at", since).limit(30000),
      supabase.from("analytics_events").select("created_at").eq("event_type", "page_view").gte("created_at", since).limit(30000),
    ])
    const pageMap: Record<string, number> = {}
    ;(pageRes.data || []).forEach((e: any) => { const u = e.page_url || "/"; pageMap[u] = (pageMap[u] || 0) + 1 })
    const scores = (seoAvgRes.data || []).map((r: any) => r.overall_score || 0)
    const series = zeroFilledSeries(days)
    const seriesIdx: Record<string, number> = {}
    series.forEach((s, i) => { seriesIdx[s.date] = i })
    ;(seriesRes.data || []).forEach((e: any) => {
      const k = label(new Date(e.created_at))
      if (seriesIdx[k] !== undefined) series[seriesIdx[k]].views++
    })
    return {
      ...base,
      days, postsPublished, views, prevViews, sessions: countSessions(sessionRes.data || []),
      topPages: Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, views]) => ({ page, views })),
      newSubscribers, adRevenue, affiliateRevenue,
      seoAvg: scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null,
      seoIssuesOpen, series,
    }
  }

  if (reportId === "seo") {
    const [auditsRes, issuesRes, latestRes] = await Promise.all([
      supabase.from("seo_audits").select("overall_score, checked_at").limit(2000),
      supabase.from("seo_issues").select("issue_type, resolved").limit(5000),
      supabase.from("seo_audits").select("checked_at").order("checked_at", { ascending: false }).limit(1),
    ])
    const audits = auditsRes.data || []
    const typeMap: Record<string, { open: number; resolved: number }> = {}
    ;(issuesRes.data || []).forEach((i: any) => {
      if (!typeMap[i.issue_type]) typeMap[i.issue_type] = { open: 0, resolved: 0 }
      if (i.resolved) typeMap[i.issue_type].resolved++
      else typeMap[i.issue_type].open++
    })
    return {
      ...base,
      audits: audits.length,
      avgScore: audits.length ? Math.round(audits.reduce((s: number, a: any) => s + (a.overall_score || 0), 0) / audits.length) : null,
      issuesByType: Object.entries(typeMap).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.open - a.open),
      issuesTotal: (issuesRes.data || []).length,
      issuesOpen: (issuesRes.data || []).filter((i: any) => !i.resolved).length,
      latestCheck: latestRes.data?.[0]?.checked_at || null,
    }
  }

  if (reportId === "revenue") {
    const [adRes, affRes, postsRes] = await Promise.all([
      supabase.from("ad_revenue").select("source, revenue").gte("date", since.slice(0, 10)).limit(2000),
      supabase.from("affiliate_sales").select("status, commission").gte("converted_at", since).limit(2000),
      supabase.from("posts").select("views").eq("status", "published"),
    ])
    const sourceMap: Record<string, number> = {}
    let adTotal = 0
    ;(adRes.data || []).forEach((r: any) => {
      const v = Number(r.revenue) || 0
      sourceMap[r.source || "other"] = (sourceMap[r.source || "other"] || 0) + v
      adTotal += v
    })
    const statusMap: Record<string, number> = {}
    let affTotal = 0
    ;(affRes.data || []).forEach((r: any) => {
      const v = Number(r.commission) || 0
      statusMap[r.status || "pending"] = (statusMap[r.status || "pending"] || 0) + v
      affTotal += v
    })
    const totalViews = (postsRes.data || []).reduce((s: number, p: any) => s + (p.views || 0), 0)
    return {
      ...base,
      adTotal, affTotal, total: adTotal + affTotal,
      adBySource: Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).map(([source, revenue]) => ({ source, revenue })),
      affByStatus: Object.entries(statusMap).map(([status, commission]) => ({ status, commission })),
      rpm: totalViews > 0 ? (adTotal + affTotal) / totalViews * 1000 : 0,
      viewsTotal: totalViews,
    }
  }

  // audience
  const [subsCount, usersCount, countryRes, deviceRes, growthRes] = await Promise.all([
    count("subscribers", [["eq", "status", "active"]]),
    count("profiles", []),
    supabase.from("analytics_events").select("country").eq("event_type", "page_view").gte("created_at", since).limit(5000),
    supabase.from("analytics_events").select("device").eq("event_type", "page_view").gte("created_at", since).limit(5000),
    supabase.from("subscribers").select("subscribed_at").eq("status", "active").gte("subscribed_at", since).limit(2000),
  ])
  const countryMap: Record<string, number> = {}
  ;(countryRes.data || []).forEach((e: any) => { if (e.country) countryMap[e.country] = (countryMap[e.country] || 0) + 1 })
  const deviceMap: Record<string, number> = {}
  ;(deviceRes.data || []).forEach((e: any) => { if (e.device) deviceMap[e.device] = (deviceMap[e.device] || 0) + 1 })
  const growth = zeroFilledSeries(30)
  const growthIdx: Record<string, number> = {}
  growth.forEach((s, i) => { growthIdx[s.date] = i })
  ;(growthRes.data || []).forEach((e: any) => {
    const k = label(new Date(e.subscribed_at))
    if (growthIdx[k] !== undefined) growth[growthIdx[k]].views++
  })
  return {
    ...base,
    subscribers: subsCount,
    users: usersCount,
    topCountries: Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
    devices: Object.entries(deviceMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    growth: growth.filter(g => g.views > 0),
  }
}

export function buildMarkdown(reportId: ReportId, data: Record<string, any>): string {
  const name = REPORT_TYPES.find(r => r.id === reportId)?.name || "Report"
  let t = `# ${name}\n`
  t += `Generated: ${new Date(data.generatedAt).toLocaleString()}\n`
  t += `Period: ${data.period}\n\n`

  if (reportId === "daily") {
    t += `## Key Metrics (Last 24 hours)\n`
    t += `- Page Views: ${data.viewsToday}\n`
    t += `- Sessions: ${data.sessionsToday}\n`
    t += `- Posts Published: ${data.postsPublished}\n`
    t += `- New Comments: ${data.commentsToday}\n`
    t += `- New Subscribers: ${data.newSubscribers}\n\n`
  } else if (reportId === "weekly" || reportId === "monthly") {
    t += `## Key Metrics (${data.days} days)\n`
    t += `- Page Views: ${data.views} (previous ${data.days}d: ${data.prevViews})\n`
    t += `- Sessions: ${data.sessions}\n`
    t += `- Posts Published: ${data.postsPublished}\n`
    t += `- New Subscribers: ${data.newSubscribers}\n`
    t += `- Ad Revenue: ${fmtMoney(data.adRevenue)}\n`
    t += `- Affiliate Revenue: ${fmtMoney(data.affiliateRevenue)}\n`
    t += `- Avg SEO Score: ${data.seoAvg ?? "N/A"}\n`
    t += `- Open SEO Issues: ${data.seoIssuesOpen}\n\n`
  } else if (reportId === "seo") {
    t += `## SEO Health\n`
    t += `- Audits on Record: ${data.audits}\n`
    t += `- Average SEO Score: ${data.avgScore ?? "N/A"}\n`
    t += `- Total Issues: ${data.issuesTotal} (${data.issuesOpen} open)\n`
    t += `- Latest Audit: ${data.latestCheck ? new Date(data.latestCheck).toLocaleDateString() : "Never"}\n\n`
    t += `## Issues by Type\n`
    if (!data.issuesByType?.length) t += `None recorded yet.\n`
    else data.issuesByType.forEach((i: any) => { t += `- ${i.type}: ${i.open} open / ${i.resolved} resolved\n` })
    t += `\n`
  } else if (reportId === "revenue") {
    t += `## Revenue (30 days)\n`
    t += `- Ad Revenue: ${fmtMoney(data.adTotal)}\n`
    t += `- Affiliate Revenue: ${fmtMoney(data.affTotal)}\n`
    t += `- Total: ${fmtMoney(data.total)}\n`
    t += `- RPM (per 1,000 article views): ${fmtMoney(data.rpm)}\n\n`
    t += `## By Ad Source\n`
    if (!data.adBySource?.length) t += `No ad revenue recorded yet.\n`
    else data.adBySource.forEach((r: any) => { t += `- ${r.source}: ${fmtMoney(r.revenue)}\n` })
    t += `\n## By Affiliate Status\n`
    data.affByStatus?.forEach((r: any) => { t += `- ${r.status}: ${fmtMoney(r.commission)}\n` })
    t += `\n`
  } else {
    t += `## Audience (30 days)\n`
    t += `- Active Subscribers: ${data.subscribers}\n`
    t += `- Registered Users: ${data.users}\n\n`
    t += `## Top Countries\n`
    if (!data.topCountries?.length) t += `No country data yet.\n`
    else data.topCountries.forEach((c: any) => { t += `- ${c.name}: ${c.count}\n` })
    t += `\n## Devices\n`
    if (!data.devices?.length) t += `No device data yet.\n`
    else data.devices.forEach((d: any) => { t += `- ${d.name}: ${d.count}\n` })
    t += `\n## Subscriber Growth (30d)\n`
    if (!data.growth?.length) t += `No new subscribers in this period.\n`
    else data.growth.forEach((g: any) => { t += `- ${g.date}: +${g.views}\n` })
    t += `\n`
  }

  if (data.topPages?.length) {
    t += `## Top Pages\n`
    data.topPages.forEach((p: any) => { t += `- ${p.page}: ${p.views} views\n` })
    t += `\n`
  }
  return t
}

export function buildCsv(reportId: ReportId, data: Record<string, any>): string {
  const rows: string[][] = [["report", REPORT_TYPES.find(r => r.id === reportId)?.name || ""], ["generated", data.generatedAt], ["period", data.period], [""]]

  if (reportId === "daily") {
    rows.push(["metric", "value"], ["page_views", String(data.viewsToday)], ["sessions", String(data.sessionsToday)],
      ["posts_published", String(data.postsPublished)], ["comments", String(data.commentsToday)], ["new_subscribers", String(data.newSubscribers)])
  } else if (reportId === "weekly" || reportId === "monthly") {
    rows.push(["metric", "value"], ["page_views", String(data.views)], ["previous_period_views", String(data.prevViews)],
      ["sessions", String(data.sessions)], ["posts_published", String(data.postsPublished)], ["new_subscribers", String(data.newSubscribers)],
      ["ad_revenue", String(data.adRevenue)], ["affiliate_revenue", String(data.affiliateRevenue)], ["avg_seo_score", String(data.seoAvg ?? "")],
      ["open_seo_issues", String(data.seoIssuesOpen)], [""], ["date", "views"])
    data.series?.forEach((s: any) => rows.push([s.date, String(s.views)]))
  } else if (reportId === "seo") {
    rows.push(["metric", "value"], ["audits_on_record", String(data.audits)], ["avg_seo_score", String(data.avgScore ?? "")],
      ["total_issues", String(data.issuesTotal)], ["open_issues", String(data.issuesOpen)], ["latest_audit", data.latestCheck || ""], [""], ["issue_type", "open", "resolved"])
    data.issuesByType?.forEach((i: any) => rows.push([i.type, String(i.open), String(i.resolved)]))
  } else if (reportId === "revenue") {
    rows.push(["metric", "value"], ["ad_revenue", String(data.adTotal)], ["affiliate_revenue", String(data.affTotal)],
      ["total", String(data.total)], ["rpm", String(data.rpm)], [""], ["source", "revenue"])
    data.adBySource?.forEach((r: any) => rows.push([r.source, String(r.revenue)]))
    rows.push([""], ["status", "commission"])
    data.affByStatus?.forEach((r: any) => rows.push([r.status, String(r.commission)]))
  } else {
    rows.push(["metric", "value"], ["active_subscribers", String(data.subscribers)], ["registered_users", String(data.users)], [""], ["country", "views"])
    data.topCountries?.forEach((c: any) => rows.push([c.name, String(c.count)]))
    rows.push([""], ["device", "views"])
    data.devices?.forEach((d: any) => rows.push([d.name, String(d.count)]))
    rows.push([""], ["date", "new_subscribers"])
    data.growth?.forEach((g: any) => rows.push([g.date, String(g.views)]))
  }

  if (data.topPages?.length) {
    rows.push([""], ["page", "views"])
    data.topPages.forEach((p: any) => rows.push([p.page, String(p.views)]))
  }
  return rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")
}

export function nextRun(frequency: string): string {
  const d = new Date()
  if (frequency === "daily") d.setDate(d.getDate() + 1)
  else if (frequency === "weekly") d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}
