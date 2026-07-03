"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit: number;
  status: "active" | "revoked";
  created_at: string;
  last_used_at: string | null;
  request_count: number;
}

interface ApiUsage {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  api_key_name: string;
  ip_address: string;
  created_at: string;
}

interface ApiOverview {
  total_keys: number;
  active_keys: number;
  requests_today: number;
  requests_this_month: number;
  avg_response_time: number;
  top_endpoints: { endpoint: string; count: number }[];
  rate_limit_status: { key_name: string; used: number; limit: number }[];
}

const defaultStyles = {
  page: { minHeight: "100vh", background: "#0F1117", color: "#E2E8F0", fontFamily: "'Inter', -apple-system, sans-serif" },
  header: { padding: "24px 32px", borderBottom: "1px solid #2D3148" },
  title: { fontSize: "24px", fontWeight: 700, color: "#F8FAFC", margin: 0 },
  subtitle: { fontSize: "13px", color: "#94A3B8", marginTop: "4px" },
  tabs: { display: "flex", gap: "2px", padding: "16px 32px", background: "#141620", borderBottom: "1px solid #2D3148" },
  tab: (active: boolean) => ({
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    transition: "all 0.2s",
    background: active ? "#10B981" : "transparent",
    color: active ? "#FFFFFF" : "#94A3B8",
    border: "none",
  }),
  content: { padding: "24px 32px" },
  card: { background: "#1C1F2E", borderRadius: "12px", border: "1px solid #2D3148", padding: "20px" },
  kpiCard: { background: "#1C1F2E", borderRadius: "12px", border: "1px solid #2D3148", padding: "20px", textAlign: "center" as const },
  badge: (color: string) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 600,
    background: `${color}20`,
    color,
  }),
  btn: (color: string = "#10B981") => ({
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    background: color,
    color: "#FFFFFF",
    transition: "all 0.2s",
  }),
  input: {
    background: "#0F1117",
    border: "1px solid #2D3148",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#E2E8F0",
    fontSize: "13px",
    outline: "none",
    width: "100%",
  },
  grid: (cols: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: "16px",
  }),
};

function OverviewTab() {
  const [overview, setOverview] = useState<ApiOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch("/admin/api-platform/api?section=overview");
        const data = await res.json();
        setOverview(data);
      } catch { setOverview(null); }
      setLoading(false);
    };
    fetchOverview();
  }, []);

  const styles = defaultStyles;

  if (loading) return <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading overview...</div>;

  const o = overview || { total_keys: 0, active_keys: 0, requests_today: 0, requests_this_month: 0, avg_response_time: 0, top_endpoints: [], rate_limit_status: [] };

  return (
    <div>
      <div style={styles.grid(4)}>
        {[
          { label: "Total API Keys", value: o.total_keys, color: "#10B981" },
          { label: "Active Keys", value: o.active_keys, color: "#3B82F6" },
          { label: "Requests Today", value: o.requests_today.toLocaleString(), color: "#F59E0B" },
          { label: "Avg Response", value: `${o.avg_response_time}ms`, color: "#8B5CF6" },
        ].map((kpi) => (
          <div key={kpi.label} style={styles.kpiCard}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ ...styles.grid(2), marginTop: "20px" }}>
        <div style={styles.card}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 16px" }}>Top Endpoints</h4>
          {o.top_endpoints.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>No data yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {o.top_endpoints.map((ep, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0F1117", borderRadius: "6px" }}>
                  <code style={{ fontSize: "12px", color: "#E2E8F0" }}>{ep.endpoint}</code>
                  <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 600 }}>{ep.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 16px" }}>Rate Limit Status</h4>
          {o.rate_limit_status.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>No active keys</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {o.rate_limit_status.map((rl, i) => (
                <div key={i} style={{ padding: "8px 12px", background: "#0F1117", borderRadius: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#E2E8F0", fontWeight: 500 }}>{rl.key_name}</span>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>{rl.used}/{rl.limit}</span>
                  </div>
                  <div style={{ height: "4px", background: "#2D3148", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min((rl.used / rl.limit) * 100, 100)}%`,
                      height: "100%",
                      background: rl.used / rl.limit > 0.8 ? "#EF4444" : "#10B981",
                      borderRadius: "2px",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApiKeysTab({ onRefresh }: { onRefresh: () => void }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState("read");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState("1000");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api-platform/api?section=keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch { setKeys([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch("/admin/api-platform/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_key",
          name: newKeyName,
          scopes: newKeyScopes.split(",").map((s) => s.trim()),
          rate_limit: parseInt(newKeyRateLimit) || 1000,
        }),
      });
      const data = await res.json();
      if (data.api_key) setCreatedKey(data.api_key);
      setNewKeyName("");
      setNewKeyScopes("read");
      setNewKeyRateLimit("1000");
      fetchKeys();
      onRefresh();
    } catch {}
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Revoke this API key?")) return;
    await fetch("/admin/api-platform/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke_key", key_id: id }),
    });
    fetchKeys();
    onRefresh();
  };

  const styles = defaultStyles;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: 0 }}>API Keys</h3>
        <button onClick={() => setShowCreate(!showCreate)} style={styles.btn("#10B981")}>+ Create Key</button>
      </div>

      {showCreate && (
        <div style={{ ...styles.card, marginBottom: "20px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 16px" }}>Create New API Key</h4>
          <div style={styles.grid(3)}>
            <div>
              <label style={{ fontSize: "12px", color: "#94A3B8", display: "block", marginBottom: "4px" }}>Name</label>
              <input style={styles.input} placeholder="e.g. Production Key" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#94A3B8", display: "block", marginBottom: "4px" }}>Scopes (comma-separated)</label>
              <input style={styles.input} placeholder="read, write" value={newKeyScopes} onChange={(e) => setNewKeyScopes(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#94A3B8", display: "block", marginBottom: "4px" }}>Rate Limit (req/min)</label>
              <input style={styles.input} placeholder="1000" value={newKeyRateLimit} onChange={(e) => setNewKeyRateLimit(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button onClick={createKey} style={styles.btn("#10B981")}>Create</button>
            <button onClick={() => setShowCreate(false)} style={styles.btn("#2D3148")}>Cancel</button>
          </div>
        </div>
      )}

      {createdKey && (
        <div style={{ ...styles.card, marginBottom: "20px", border: "1px solid #10B981" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#10B981", margin: "0 0 8px" }}>API Key Created</h4>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 8px" }}>Copy this key now — it won&apos;t be shown again.</p>
          <code style={{ display: "block", padding: "12px", background: "#0F1117", borderRadius: "8px", fontSize: "13px", color: "#F8FAFC", wordBreak: "break-all" }}>{createdKey}</code>
          <button onClick={() => setCreatedKey(null)} style={{ ...styles.btn("#2D3148"), marginTop: "8px" }}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading keys...</div>
      ) : keys.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>🔑</div>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>No API keys yet</p>
        </div>
      ) : (
        <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2D3148" }}>
                {["Name", "Prefix", "Scopes", "Rate Limit", "Requests", "Last Used", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} style={{ borderBottom: "1px solid #2D3148" }}>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#F8FAFC", fontWeight: 500 }}>{key.name}</td>
                  <td style={{ padding: "12px 16px" }}><code style={{ fontSize: "12px", color: "#E2E8F0", background: "#0F1117", padding: "2px 8px", borderRadius: "4px" }}>{key.prefix}...</code></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {key.scopes.map((s) => (
                        <span key={s} style={styles.badge("#10B981")}>{s}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#94A3B8" }}>{key.rate_limit}/min</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#94A3B8" }}>{key.request_count.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "#64748B" }}>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={styles.badge(key.status === "active" ? "#10B981" : "#EF4444")}>{key.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {key.status === "active" && (
                      <button onClick={() => revokeKey(key.id)} style={styles.btn("#EF4444")}>Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsageTab() {
  const [usage, setUsage] = useState<ApiUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/admin/api-platform/api?section=usage");
        const data = await res.json();
        setUsage(data.usage || []);
      } catch { setUsage([]); }
      setLoading(false);
    };
    fetchUsage();
  }, []);

  const statusColor = (code: number) => {
    if (code >= 200 && code < 300) return "#10B981";
    if (code >= 400 && code < 500) return "#F59E0B";
    if (code >= 500) return "#EF4444";
    return "#94A3B8";
  };

  const styles = defaultStyles;

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 20px" }}>Request History</h3>
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading usage...</div>
      ) : usage.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>No API requests logged yet</p>
        </div>
      ) : (
        <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2D3148" }}>
                {["Endpoint", "Method", "Status", "Response Time", "API Key", "IP", "Time"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usage.map((req) => (
                <tr key={req.id} style={{ borderBottom: "1px solid #2D3148" }}>
                  <td style={{ padding: "10px 14px" }}><code style={{ fontSize: "12px", color: "#E2E8F0" }}>{req.endpoint}</code></td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={styles.badge(req.method === "GET" ? "#3B82F6" : req.method === "POST" ? "#10B981" : "#F59E0B")}>{req.method}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={styles.badge(statusColor(req.status_code))}>{req.status_code}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: "12px", color: "#94A3B8" }}>{req.response_time_ms}ms</td>
                  <td style={{ padding: "10px 14px", fontSize: "12px", color: "#64748B" }}>{req.api_key_name}</td>
                  <td style={{ padding: "10px 14px", fontSize: "12px", color: "#64748B" }}>{req.ip_address}</td>
                  <td style={{ padding: "10px 14px", fontSize: "12px", color: "#64748B" }}>{new Date(req.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentationTab() {
  const styles = defaultStyles;

  const endpoints = [
    { method: "GET", path: "/api/public/v1/posts", desc: "List published posts with pagination", auth: "API Key", rate: "1000/min" },
    { method: "GET", path: "/api/public/v1/posts/:slug", desc: "Get a single post by slug", auth: "API Key", rate: "1000/min" },
    { method: "GET", path: "/api/public/v1/categories", desc: "List all categories", auth: "None (public)", rate: "2000/min" },
    { method: "GET", path: "/api/public/v1/search?q=query", desc: "Search posts by query", auth: "API Key", rate: "500/min" },
    { method: "GET", path: "/api/public/v1/tags", desc: "List all tags", auth: "None (public)", rate: "2000/min" },
  ];

  return (
    <div>
      <div style={styles.card}>
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#F8FAFC", margin: "0 0 12px" }}>TechPivo Public API v1</h3>
        <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.6", margin: "0 0 20px" }}>
          Access TechPivo content programmatically. All requests require an API key passed via the <code style={{ background: "#0F1117", padding: "2px 6px", borderRadius: "4px" }}>X-API-Key</code> header.
          Some endpoints are public and don&apos;t require authentication.
        </p>

        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 12px" }}>Authentication</h4>
        <div style={{ background: "#0F1117", borderRadius: "8px", padding: "16px", marginBottom: "20px", fontFamily: "monospace", fontSize: "12px", color: "#10B981" }}>
          curl -H &quot;X-API-Key: tp_live_xxxxxxxxxxxx&quot; https://techpivo.com/api/public/v1/posts
        </div>

        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 12px" }}>Rate Limits</h4>
        <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 16px" }}>
          Rate limits are per API key. Default: 1000 requests per minute. Returns HTTP 429 when exceeded.
        </p>

        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 12px" }}>Endpoints</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {endpoints.map((ep, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "#0F1117", borderRadius: "8px", flexWrap: "wrap" }}>
              <span style={styles.badge(ep.method === "GET" ? "#3B82F6" : "#10B981")}>{ep.method}</span>
              <code style={{ fontSize: "13px", color: "#E2E8F0", flex: "1 1 200px" }}>{ep.path}</code>
              <span style={{ fontSize: "12px", color: "#94A3B8", flex: "1 1 200px" }}>{ep.desc}</span>
              <span style={styles.badge("#8B5CF6")}>{ep.auth}</span>
              <span style={{ fontSize: "11px", color: "#64748B" }}>{ep.rate}</span>
            </div>
          ))}
        </div>

        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: "20px 0 12px" }}>Response Format</h4>
        <div style={{ background: "#0F1117", borderRadius: "8px", padding: "16px", fontFamily: "monospace", fontSize: "12px", color: "#94A3B8", lineHeight: "1.6" }}>
          {`{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}`}
        </div>

        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: "20px 0 12px" }}>Error Responses</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { code: "401", desc: "Unauthorized — invalid or missing API key" },
            { code: "403", desc: "Forbidden — key lacks required scope" },
            { code: "404", desc: "Not Found — resource doesn't exist" },
            { code: "429", desc: "Too Many Requests — rate limit exceeded" },
            { code: "500", desc: "Internal Server Error" },
          ].map((err) => (
            <div key={err.code} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px", background: "#0F1117", borderRadius: "6px" }}>
              <span style={styles.badge("#EF4444")}>{err.code}</span>
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>{err.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ApiPlatformPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "keys" | "usage" | "docs">("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const styles = defaultStyles;

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "keys" as const, label: "API Keys" },
    { key: "usage" as const, label: "Usage" },
    { key: "docs" as const, label: "Documentation" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔌 Public API Platform</h1>
        <p style={styles.subtitle}>Manage API keys, monitor usage, and access API documentation</p>
      </div>
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button key={tab.key} style={styles.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {activeTab === "overview" && <OverviewTab key={refreshKey} />}
        {activeTab === "keys" && <ApiKeysTab key={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />}
        {activeTab === "usage" && <UsageTab />}
        {activeTab === "docs" && <DocumentationTab />}
      </div>
    </div>
  );
}
