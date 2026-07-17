"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
}

interface WorkflowEdge {
  from: string;
  to: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggers: any;
  actions: any;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowRun {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  nodes_completed: number;
  nodes_total: number;
  error: string | null;
}

const NODE_PALETTE = [
  { type: "research", label: "Research", icon: "🔍", color: "#3B82F6" },
  { type: "write", label: "Write", icon: "✍️", color: "#8B5CF6" },
  { type: "seo", label: "SEO", icon: "📊", color: "#10B981" },
  { type: "image", label: "Image", icon: "🖼️", color: "#F59E0B" },
  { type: "social", label: "Social", icon: "📱", color: "#EC4899" },
  { type: "publish", label: "Publish", icon: "🚀", color: "#EF4444" },
  { type: "index", label: "Index", icon: "🔎", color: "#06B6D4" },
];

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
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
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

function getNodes(triggers: any): WorkflowNode[] {
  if (!triggers) return [];
  if (Array.isArray(triggers)) return triggers;
  if (triggers.nodes && Array.isArray(triggers.nodes)) return triggers.nodes;
  return [];
}

function getEdges(triggers: any): WorkflowEdge[] {
  if (!triggers) return [];
  if (triggers.edges && Array.isArray(triggers.edges)) return triggers.edges;
  return [];
}

function WorkflowsTab({ onRefresh }: { onRefresh: () => void }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("automation_workflows")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) throw new Error(err.message);
      setWorkflows(data || []);
    } catch (e: any) {
      setWorkflows([]);
      setError(e?.message || "Failed to load workflows");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const toggleWorkflow = async (id: string, currentActive: boolean) => {
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("automation_workflows")
        .update({ is_active: !currentActive })
        .eq("id", id);
      if (err) throw new Error(err.message);
      fetchWorkflows();
    } catch {
      // silent
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("automation_workflows")
        .delete()
        .eq("id", id);
      if (err) throw new Error(err.message);
      fetchWorkflows();
      onRefresh();
    } catch {
      // silent
    }
  };

  const runWorkflow = async (id: string) => {
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("automation_workflows")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", id);
      if (err) throw new Error(err.message);
      fetchWorkflows();
    } catch {
      // silent
    }
  };

  const styles = defaultStyles;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: 0 }}>Automation Workflows</h3>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading workflows...</div>
      ) : error ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <h3 style={{ fontSize: "16px", color: "#EF4444", margin: "0 0 8px" }}>Error</h3>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>{error}</p>
        </div>
      ) : workflows.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚡</div>
          <h3 style={{ fontSize: "16px", color: "#F8FAFC", margin: "0 0 8px" }}>No workflows yet</h3>
          <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>Create your first workflow in the Builder tab</p>
        </div>
      ) : (
        <div style={styles.grid(1)}>
          {workflows.map((wf) => {
            const nodes = getNodes(wf.triggers);
            const statusLabel = wf.is_active ? "active" : "paused";
            const statusColor = wf.is_active ? "#10B981" : "#F59E0B";
            return (
              <div key={wf.id} style={{ ...styles.card, display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 300px" }}>
                  <div style={styles.cardHeader}>
                    <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#F8FAFC", margin: 0 }}>{wf.name}</h4>
                    <span style={styles.badge(statusColor)}>
                      {statusLabel.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 8px" }}>{wf.description}</p>
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#64748B" }}>
                    <span>Nodes: {nodes.length}</span>
                    <span>Last: {wf.last_run_at ? new Date(wf.last_run_at).toLocaleDateString() : "Never"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => runWorkflow(wf.id)} style={styles.btn("#8B5CF6")}>▶ Run</button>
                  <button onClick={() => toggleWorkflow(wf.id, wf.is_active)} style={styles.btn(wf.is_active ? "#F59E0B" : "#10B981")}>
                    {wf.is_active ? "⏸ Pause" : "▶ Activate"}
                  </button>
                  <button onClick={() => deleteWorkflow(wf.id)} style={styles.btn("#EF4444")}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BuilderTab({ onRefresh }: { onRefresh: () => void }) {
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addNode = (type: string, label: string, icon: string, color: string) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      label,
      x: 100 + (nodes.length % 4) * 200,
      y: 80 + Math.floor(nodes.length / 4) * 120,
    };
    setNodes((prev) => [...prev, newNode]);
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setEdges((prev) => [...prev, { from: lastNode.id, to: newNode.id }]);
    }
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    if (selectedNode === id) setSelectedNode(null);
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) { alert("Enter workflow name"); return; }
    if (nodes.length === 0) { alert("Add at least one node"); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("automation_workflows")
        .insert({
          name: workflowName,
          description: workflowDesc,
          triggers: { nodes, edges },
          actions: [],
          is_active: false,
        });
      if (err) throw new Error(err.message);
      setWorkflowName("");
      setWorkflowDesc("");
      setNodes([]);
      setEdges([]);
      onRefresh();
      alert("Workflow created!");
    } catch (e: any) {
      alert("Failed to save: " + (e?.message || "Unknown error"));
    }
    setSaving(false);
  };

  const styles = defaultStyles;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", minHeight: "500px" }}>
      {/* Palette */}
      <div style={{ ...styles.card, padding: "16px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
          Node Palette
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {NODE_PALETTE.map((item) => (
            <button
              key={item.type}
              onClick={() => addNode(item.type, item.label, item.icon, item.color)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${item.color}30`,
                background: `${item.color}10`,
                color: item.color,
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "16px" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "20px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Workflow Info
          </h4>
          <input
            style={{ ...styles.input, marginBottom: "8px" }}
            placeholder="Workflow name"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
          />
          <textarea
            style={{ ...styles.input, minHeight: "60px", resize: "vertical", marginBottom: "8px" }}
            placeholder="Description"
            value={workflowDesc}
            onChange={(e) => setWorkflowDesc(e.target.value)}
          />
          <button
            onClick={saveWorkflow}
            disabled={saving}
            style={{ ...styles.btn("#8B5CF6"), width: "100%", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "💾 Save Workflow"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ ...styles.card, padding: "20px", overflow: "auto", position: "relative" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
          Canvas — {nodes.length} nodes, {edges.length} connections
        </h4>

        {nodes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748B" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎨</div>
            <p style={{ fontSize: "13px" }}>Add nodes from the palette to build your workflow</p>
          </div>
        ) : (
          <div style={{ position: "relative", minHeight: "400px" }}>
            {/* Edges (SVG lines) */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {edges.map((edge, i) => {
                const fromNode = nodes.find((n) => n.id === edge.from);
                const toNode = nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const x1 = fromNode.x + 80;
                const y1 = fromNode.y + 30;
                const x2 = toNode.x + 80;
                const y2 = toNode.y + 30;
                return (
                  <g key={i}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8B5CF6" strokeWidth="2" strokeDasharray="6,4" />
                    <circle cx={x2} cy={y2} r="4" fill="#8B5CF6" />
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const palette = NODE_PALETTE.find((p) => p.type === node.type) || NODE_PALETTE[0];
              const isSelected = selectedNode === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: "160px",
                    background: isSelected ? `${palette.color}20` : "#141620",
                    border: `2px solid ${isSelected ? palette.color : "#2D3148"}`,
                    borderRadius: "10px",
                    padding: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    zIndex: 2,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "18px" }}>{palette.icon}</span>
                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                        style={{ background: "#EF4444", border: "none", color: "#FFF", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", cursor: "pointer" }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#F8FAFC" }}>{node.label}</div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>{palette.type}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const styles = defaultStyles;

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 20px" }}>Workflow Templates</h3>
      <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
        <h3 style={{ fontSize: "16px", color: "#F8FAFC", margin: "0 0 8px" }}>No templates available</h3>
        <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>Templates will be available in a future update</p>
      </div>
    </div>
  );
}

function RunsTab() {
  const styles = defaultStyles;

  return (
    <div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F8FAFC", margin: "0 0 20px" }}>Workflow Runs</h3>
      <div style={{ ...styles.card, textAlign: "center", padding: "60px" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
        <h3 style={{ fontSize: "16px", color: "#F8FAFC", margin: "0 0 8px" }}>No runs yet</h3>
        <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>Run a workflow to see execution history here</p>
      </div>
    </div>
  );
}

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState<"workflows" | "builder" | "templates" | "runs">("workflows");
  const [refreshKey, setRefreshKey] = useState(0);

  const styles = defaultStyles;

  const tabs = [
    { key: "workflows" as const, label: "Workflows" },
    { key: "builder" as const, label: "Builder" },
    { key: "templates" as const, label: "Templates" },
    { key: "runs" as const, label: "Runs" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚡ Workflow Automation</h1>
        <p style={styles.subtitle}>Design, deploy, and monitor automated publishing workflows</p>
      </div>
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button key={tab.key} style={styles.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {activeTab === "workflows" && <WorkflowsTab key={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />}
        {activeTab === "builder" && <BuilderTab onRefresh={() => setRefreshKey((k) => k + 1)} />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "runs" && <RunsTab key={refreshKey} />}
      </div>
    </div>
  );
}
