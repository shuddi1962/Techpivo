import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const section = request.nextUrl.searchParams.get("section") || "workflows";

    if (section === "workflows") {
      const { data: workflows, error } = await supabase
        .from("automation_workflows" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error && error.code === "42P01") {
        return NextResponse.json({ workflows: [] });
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
        .from("automation_runs" as any)
        .select("*, automation_workflows(name)")
        .order("started_at", { ascending: false })
        .limit(50);

      if (error && error.code === "42P01") {
        return NextResponse.json({ runs: [] });
      }

      const enriched = (runs || []).map((run: any) => ({
        ...run,
        workflow_name: run.automation_workflows?.name || "Unknown",
      }));
      return NextResponse.json({ runs: enriched });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action } = body;

    if (action === "create_workflow") {
      const { name, description, nodes, edges } = body;
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

      const { data, error } = await supabase
        .from("automation_workflows" as any)
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

      if (error && error.code === "42P01") {
        return NextResponse.json({ success: true, message: "Workflow saved (mock)" });
      }
      if (error) throw error;
      return NextResponse.json({ success: true, workflow: data });
    }

    if (action === "run_workflow") {
      const { workflow_id } = body;
      if (!workflow_id) return NextResponse.json({ error: "workflow_id required" }, { status: 400 });

      const { data: workflow, error: fetchErr } = await supabase
        .from("automation_workflows" as any)
        .select("*")
        .eq("id", workflow_id)
        .single();

      if (fetchErr && fetchErr.code === "42P01") {
        return NextResponse.json({ success: true, message: "Workflow run started (mock)" });
      }

      const nodesCount = Array.isArray((workflow as any)?.nodes) ? (workflow as any).nodes.length : 0;

      const { error: runErr } = await supabase
        .from("automation_runs" as any)
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

      if (runErr && runErr.code !== "42P01") throw runErr;

      await supabase
        .from("automation_workflows" as any)
        .update({
          run_count: ((workflow as any)?.run_count || 0) + 1,
          last_run: new Date().toISOString(),
          status: "active",
        })
        .eq("id", workflow_id);

      return NextResponse.json({ success: true, message: "Workflow execution started" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action, workflow_id } = body;

    if (!workflow_id) return NextResponse.json({ error: "workflow_id required" }, { status: 400 });

    if (action === "update_status") {
      const { status } = body;
      const { error } = await supabase
        .from("automation_workflows" as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", workflow_id);
      if (error && error.code !== "42P01") throw error;
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
        .from("automation_workflows" as any)
        .update(updates)
        .eq("id", workflow_id);
      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action, workflow_id, run_id } = body;

    if (action === "delete_workflow") {
      if (!workflow_id) return NextResponse.json({ error: "workflow_id required" }, { status: 400 });
      const { error } = await supabase
        .from("automation_workflows" as any)
        .delete()
        .eq("id", workflow_id);
      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "delete_run") {
      if (!run_id) return NextResponse.json({ error: "run_id required" }, { status: 400 });
      const { error } = await supabase
        .from("automation_runs" as any)
        .delete()
        .eq("id", run_id);
      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
