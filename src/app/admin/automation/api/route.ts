import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

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

function logError(context: string, err: unknown) {
  console.error(`[automation api] ${context}:`, err);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient();
    const section = request.nextUrl.searchParams.get("section") || "workflows";

    if (section === "workflows") {
      const { data: workflows, error } = await supabase
        .from("automation_workflows")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logError("GET workflows", error);
        return NextResponse.json({ workflows: [], error: "Workflows table not available" });
      }
      return NextResponse.json({ workflows: workflows || [] });
    }

    if (section === "templates") {
      const defaultTemplates = [
        {
          id: "tpl_rss",
          name: "Auto Publish from RSS",
          description: "Automatically import RSS feeds, detect new content, research topics, and generate TechPivo articles with full SEO optimization.",
          category: "Content",
          nodes: [
            { id: "n1", type: "research", label: "RSS Import", x: 100, y: 80 },
            { id: "n2", type: "research", label: "Topic Research", x: 300, y: 80 },
            { id: "n3", type: "write", label: "Generate Draft", x: 500, y: 80 },
            { id: "n4", type: "seo", label: "SEO Optimize", x: 700, y: 80 },
            { id: "n5", type: "image", label: "Image Search", x: 900, y: 80 },
            { id: "n6", type: "social", label: "Social Posts", x: 1100, y: 80 },
            { id: "n7", type: "publish", label: "Publish", x: 1300, y: 80 },
            { id: "n8", type: "index", label: "Request Index", x: 1500, y: 80 },
          ],
          edges: [
            { from: "n1", to: "n2" },
            { from: "n2", to: "n3" },
            { from: "n3", to: "n4" },
            { from: "n4", to: "n5" },
            { from: "n5", to: "n6" },
            { from: "n6", to: "n7" },
            { from: "n7", to: "n8" },
          ],
        },
        {
          id: "tpl_refresh",
          name: "Content Refresh Cycle",
          description: "Monitor existing articles for content decay, research updates, refresh content, re-optimize SEO, and republish with fresh data.",
          category: "SEO",
          nodes: [
            { id: "n1", type: "research", label: "Detect Decay", x: 100, y: 80 },
            { id: "n2", type: "research", label: "Research Updates", x: 300, y: 80 },
            { id: "n3", type: "write", label: "Refresh Content", x: 500, y: 80 },
            { id: "n4", type: "seo", label: "Re-optimize SEO", x: 700, y: 80 },
            { id: "n5", type: "image", label: "Update Images", x: 900, y: 80 },
            { id: "n6", type: "publish", label: "Republish", x: 1100, y: 80 },
          ],
          edges: [
            { from: "n1", to: "n2" },
            { from: "n2", to: "n3" },
            { from: "n3", to: "n4" },
            { from: "n4", to: "n5" },
            { from: "n5", to: "n6" },
          ],
        },
        {
          id: "tpl_social",
          name: "Social Distribution",
          description: "After publishing, automatically generate platform-specific social content and schedule posts across all connected platforms.",
          category: "Marketing",
          nodes: [
            { id: "n1", type: "social", label: "Generate Captions", x: 100, y: 80 },
            { id: "n2", type: "image", label: "Create Images", x: 300, y: 80 },
            { id: "n3", type: "social", label: "Schedule Posts", x: 500, y: 80 },
            { id: "n4", type: "social", label: "Newsletter", x: 700, y: 80 },
          ],
          edges: [
            { from: "n1", to: "n2" },
            { from: "n2", to: "n3" },
            { from: "n3", to: "n4" },
          ],
        },
      ];
      return NextResponse.json({ templates: defaultTemplates });
    }

    if (section === "runs") {
      const { data: runs, error } = await supabase
        .from("automation_runs")
        .select("*, automation_workflows(name)")
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) {
        logError("GET runs", error);
        return NextResponse.json({ runs: [], error: "Runs table not available" });
      }

      const enriched = (runs || []).map((run: any) => ({
        ...run,
        workflow_name: run.automation_workflows?.name || "Unknown",
      }));
      return NextResponse.json({ runs: enriched });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch (err) {
    logError("GET", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action } = body;

    if (action === "create_workflow") {
      const { name, description, nodes, edges } = body;
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

      const { data, error } = await supabase
        .from("automation_workflows")
        .insert({
          name,
          description: description || "",
          status: "draft",
          nodes: nodes || [],
          edges: edges || [],
          run_count: 0,
          last_run: null,
        })
        .select()
        .single();

      if (error) {
        logError("POST create_workflow", error);
        return NextResponse.json({ success: false, error: "Workflows table not available: " + error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, workflow: data });
    }

    if (action === "run_workflow") {
      const { workflow_id } = body;
      if (!workflow_id) return NextResponse.json({ error: "workflow_id required" }, { status: 400 });

      const { data: workflow, error: fetchErr } = await supabase
        .from("automation_workflows")
        .select("*")
        .eq("id", workflow_id)
        .single();

      if (fetchErr) {
        logError("POST run_workflow fetch", fetchErr);
        return NextResponse.json({ success: false, error: "Workflows table not available: " + fetchErr.message }, { status: 500 });
      }

      const wf = workflow as { nodes?: unknown[]; run_count?: number } | null;
      const nodesCount = Array.isArray(wf?.nodes) ? wf.nodes.length : 0;

      const { error: runErr } = await supabase
        .from("automation_runs")
        .insert({
          workflow_id,
          status: "running",
          started_at: new Date().toISOString(),
          completed_at: null,
          duration_ms: null,
          nodes_completed: 0,
          nodes_total: nodesCount,
          error: null,
        });

      if (runErr) {
        logError("POST run_workflow insert", runErr);
        return NextResponse.json({ success: false, error: "Failed to create workflow run: " + runErr.message }, { status: 500 });
      }

      await supabase
        .from("automation_workflows")
        .update({
          run_count: (wf?.run_count || 0) + 1,
          last_run: new Date().toISOString(),
          status: "active",
        })
        .eq("id", workflow_id);

      return NextResponse.json({ success: true, message: "Workflow execution started" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logError("POST", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action, workflow_id } = body;

    if (!workflow_id) return NextResponse.json({ error: "workflow_id required" }, { status: 400 });

    if (action === "update_status") {
      const { status } = body;
      const { error } = await supabase
        .from("automation_workflows")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", workflow_id);
      if (error) {
        logError("PUT update_status", error);
        return NextResponse.json({ error: "Database error: " + error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update_workflow") {
      const { name, description, nodes, edges } = body;
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (nodes !== undefined) updates.nodes = nodes;
      if (edges !== undefined) updates.edges = edges;

      const { error } = await supabase
        .from("automation_workflows")
        .update(updates)
        .eq("id", workflow_id);
      if (error) {
        logError("PUT update_workflow", error);
        return NextResponse.json({ error: "Database error: " + error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logError("PUT", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(["admin", "editor"], request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action, workflow_id, run_id } = body;

    if (action === "delete_workflow") {
      if (!workflow_id) return NextResponse.json({ error: "workflow_id required" }, { status: 400 });
      const { error } = await supabase
        .from("automation_workflows")
        .delete()
        .eq("id", workflow_id);
      if (error) {
        logError("DELETE workflow", error);
        return NextResponse.json({ error: "Database error: " + error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "delete_run") {
      if (!run_id) return NextResponse.json({ error: "run_id required" }, { status: 400 });
      const { error } = await supabase
        .from("automation_runs")
        .delete()
        .eq("id", run_id);
      if (error) {
        logError("DELETE run", error);
        return NextResponse.json({ error: "Database error: " + error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logError("DELETE", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
