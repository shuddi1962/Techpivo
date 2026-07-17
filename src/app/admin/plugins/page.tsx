"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Plugin {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  version: string;
  author: string;
  category: string;
  is_installed: boolean;
  is_active: boolean;
  is_premium: boolean;
  price: number;
  rating: number;
  review_count: number;
  downloads: number;
  created_at: string;
  updated_at: string;
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
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("plugins")
        .select("*")
        .order("downloads", { ascending: false });
      if (err) throw new Error(err.message);
      setPlugins(data || []);
    } catch (e: any) {
      setPlugins([]);
      setError(e?.message || "Failed to load plugins");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlugins(); }, [fetchPlugins]);

  const installPlugin = async (pluginId: string) => {
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("plugins")
        .update({ is_installed: true, is_active: true })
        .eq("id", pluginId);
      if (err) throw new Error(err.message);
      fetchPlugins();
      onRefresh();
    } catch {
      // silent
    }
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
      ) : error ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <h3 style={{ fontSize: "16px", color: "#F8FAFC", margin: "0 0 8px" }}>Could not load plugins</h3>
          <p style={{ fontSize: "13px", color: "#EF4444", margin: 0 }}>{error}</p>
        </div>
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
              <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                <button
                  onClick={() => installPlugin(plugin.id)}
                  disabled={plugin.is_installed}
                  style={{
                    ...styles.btn(plugin.is_installed ? "#2D3148" : "#8B5CF6"),
                    flex: 1,
                    opacity: plugin.is_installed ? 0.5 : 1,
                    cursor: plugin.is_installed ? "default" : "pointer",
                  }}
                >
                  {plugin.is_installed ? "✓ Installed" : plugin.is_premium ? `$${plugin.price}` : "Free"}
                </button>
              </div>
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
  const [error, setError] = useState<string | null>(null);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);

  const fetchInstalled = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("plugins")
        .select("*")
        .eq("is_installed", true)
        .order("name");
      if (err) throw new Error(err.message);
      setPlugins(data || []);
    } catch (e: any) {
      setPlugins([]);
      setError(e?.message || "Failed to load installed plugins");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInstalled(); }, [fetchInstalled]);

  const togglePlugin = async (pluginId: string, currentActive: boolean) => {
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("plugins")
        .update({ is_active: !currentActive })
        .eq("id", pluginId);
      if (err) throw new Error(err.message);
      fetchInstalled();
      onRefresh();
    } catch {
      // silent
    }
  };

  const uninstallPlugin = async (pluginId: string) => {
    if (!confirm("Uninstall this plugin?")) return;
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("plugins")
        .update({ is_installed: false, is_active: false })
        .eq("id", pluginId);
      if (err) throw new Error(err.message);
      fetchInstalled();
      onRefresh();
    } catch {
      // silent
    }
  };

  const styles = defaultStyles;

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 20px" }}>Installed Plugins</h3>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div>
      ) : error ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <h3 style={{ fontSize: "16px", color: "#EF4444", margin: "0 0 8px" }}>Error</h3>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>{error}</p>
        </div>
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
                <button onClick={() => togglePlugin(plugin.id, plugin.is_active)} style={styles.btn(plugin.is_active ? "#10B981" : "#F59E0B")}>
                  {plugin.is_active ? "● Active" : "○ Inactive"}
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpdates = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: err } = await supabase
          .from("plugins")
          .select("*")
          .eq("is_installed", true)
          .order("name");
        if (err) throw new Error(err.message);
        setUpdates(data || []);
      } catch (e: any) {
        setUpdates([]);
        setError(e?.message || "Failed to check updates");
      }
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
      ) : error ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <h3 style={{ fontSize: "16px", color: "#EF4444", margin: "0 0 8px" }}>Error</h3>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>{error}</p>
        </div>
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
