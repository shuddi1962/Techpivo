"use client";

import { useState, useEffect, useCallback } from "react";

interface Plugin {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  category: string;
  icon: string;
  installed: boolean;
  active: boolean;
  settings?: Record<string, any>;
}

const CATEGORY_COLORS: Record<string, string> = {
  SEO: "#10B981",
  AI: "#8B5CF6",
  Analytics: "#3B82F6",
  Security: "#EF4444",
  Marketing: "#F59E0B",
  Developer: "#06B6D4",
  Integrations: "#EC4899",
};

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
    background: active ? "#8B5CF6" : "transparent",
    color: active ? "#FFFFFF" : "#94A3B8",
    border: "none",
  }),
  content: { padding: "24px 32px" },
  card: { background: "#1C1F2E", borderRadius: "12px", border: "1px solid #2D3148", padding: "20px" },
  badge: (color: string) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 600,
    background: `${color}20`,
    color,
  }),
  btn: (color: string = "#8B5CF6") => ({
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

function MarketplaceTab({ onRefresh }: { onRefresh: () => void }) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/plugins/api?section=marketplace");
      const data = await res.json();
      setPlugins(data.plugins || []);
    } catch { setPlugins([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlugins(); }, [fetchPlugins]);

  const installPlugin = async (pluginId: string) => {
    await fetch("/admin/plugins/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "install", plugin_id: pluginId }),
    });
    fetchPlugins();
    onRefresh();
  };

  const categories = ["All", ...Array.from(new Set(plugins.map((p) => p.category)))];
  const filtered = filter === "All" ? plugins : plugins.filter((p) => p.category === filter);
  const styles = defaultStyles;

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            ...styles.btn(filter === cat ? "#8B5CF6" : "#1C1F2E"),
            border: `1px solid ${filter === cat ? "#8B5CF6" : "#2D3148"}`,
          }}>
            {cat}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading plugins...</div>
      ) : (
        <div style={styles.grid(3)}>
          {filtered.map((plugin) => (
            <div key={plugin.id} style={{ ...styles.card, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: `${CATEGORY_COLORS[plugin.category] || "#8B5CF6"}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  flexShrink: 0,
                }}>
                  {plugin.icon || "📦"}
                </div>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: 0 }}>{plugin.name}</h4>
                  <p style={{ fontSize: "11px", color: "#64748B", margin: 0 }}>by {plugin.author} • v{plugin.version}</p>
                </div>
              </div>
              <span style={{ ...styles.badge(CATEGORY_COLORS[plugin.category] || "#8B5CF6"), alignSelf: "flex-start", marginBottom: "8px" }}>
                {plugin.category}
              </span>
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.5", flex: 1, margin: "0 0 16px" }}>{plugin.description}</p>
              <button
                onClick={() => installPlugin(plugin.id)}
                disabled={plugin.installed}
                style={{
                  ...styles.btn(plugin.installed ? "#2D3148" : "#8B5CF6"),
                  width: "100%",
                  opacity: plugin.installed ? 0.5 : 1,
                  cursor: plugin.installed ? "default" : "pointer",
                }}
              >
                {plugin.installed ? "✓ Installed" : "Install"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InstalledTab({ onRefresh }: { onRefresh: () => void }) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);

  const fetchInstalled = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/plugins/api?section=installed");
      const data = await res.json();
      setPlugins(data.plugins || []);
    } catch { setPlugins([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInstalled(); }, [fetchInstalled]);

  const togglePlugin = async (pluginId: string, currentActive: boolean) => {
    await fetch("/admin/plugins/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", plugin_id: pluginId, active: !currentActive }),
    });
    fetchInstalled();
    onRefresh();
  };

  const uninstallPlugin = async (pluginId: string) => {
    if (!confirm("Uninstall this plugin?")) return;
    await fetch("/admin/plugins/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "uninstall", plugin_id: pluginId }),
    });
    fetchInstalled();
    onRefresh();
  };

  const styles = defaultStyles;

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 20px" }}>Installed Plugins</h3>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div>
      ) : plugins.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📦</div>
          <h3 style={{ fontSize: "16px", color: "#F8FAFC", margin: "0 0 8px" }}>No plugins installed</h3>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>Browse the Marketplace to install plugins</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {plugins.map((plugin) => (
            <div key={plugin.id} style={{ ...styles.card, display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "10px",
                background: `${CATEGORY_COLORS[plugin.category] || "#8B5CF6"}20`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0,
              }}>
                {plugin.icon || "📦"}
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: 0 }}>{plugin.name}</h4>
                  <span style={styles.badge(CATEGORY_COLORS[plugin.category] || "#8B5CF6")}>{plugin.category}</span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 0" }}>v{plugin.version} • by {plugin.author}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => togglePlugin(plugin.id, plugin.active)} style={styles.btn(plugin.active ? "#10B981" : "#F59E0B")}>
                  {plugin.active ? "● Active" : "○ Inactive"}
                </button>
                <button onClick={() => setEditingPlugin(plugin)} style={styles.btn("#3B82F6")}>⚙ Settings</button>
                <button onClick={() => uninstallPlugin(plugin.id)} style={styles.btn("#EF4444")}>Uninstall</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingPlugin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setEditingPlugin(null)}>
          <div style={{ ...styles.card, width: "480px", maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 16px" }}>Settings — {editingPlugin.name}</h3>
            <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 16px" }}>Plugin-specific settings would appear here.</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setEditingPlugin(null)} style={styles.btn("#2D3148")}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UpdatesTab() {
  const [updates, setUpdates] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const res = await fetch("/admin/plugins/api?section=updates");
        const data = await res.json();
        setUpdates(data.plugins || []);
      } catch { setUpdates([]); }
      setLoading(false);
    };
    fetchUpdates();
  }, []);

  const styles = defaultStyles;

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 20px" }}>Available Updates</h3>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Checking for updates...</div>
      ) : updates.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
          <h3 style={{ fontSize: "16px", color: "#F8FAFC", margin: "0 0 8px" }}>All plugins up to date</h3>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>No updates available at this time</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {updates.map((plugin) => (
            <div key={plugin.id} style={{ ...styles.card, display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "10px",
                background: `${CATEGORY_COLORS[plugin.category] || "#8B5CF6"}20`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0,
              }}>
                {plugin.icon || "📦"}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: 0 }}>{plugin.name}</h4>
                <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 0" }}>v{plugin.version} • {plugin.author}</p>
              </div>
              <button style={styles.btn("#10B981")}>Update</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PluginsPage() {
  const [activeTab, setActiveTab] = useState<"marketplace" | "installed" | "updates">("marketplace");
  const [refreshKey, setRefreshKey] = useState(0);
  const styles = defaultStyles;

  const tabs = [
    { key: "marketplace" as const, label: "Marketplace" },
    { key: "installed" as const, label: "Installed" },
    { key: "updates" as const, label: "Updates" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🧩 Plugin Marketplace</h1>
        <p style={styles.subtitle}>Extend TechPivo with powerful plugins and integrations</p>
      </div>
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button key={tab.key} style={styles.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {activeTab === "marketplace" && <MarketplaceTab key={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />}
        {activeTab === "installed" && <InstalledTab key={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />}
        {activeTab === "updates" && <UpdatesTab />}
      </div>
    </div>
  );
}
