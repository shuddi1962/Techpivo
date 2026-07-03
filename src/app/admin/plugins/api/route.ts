import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MARKETPLACE_PLUGINS = [
  { id: "seo-master", name: "SEO Master Pro", author: "TechPivo Labs", version: "2.4.0", description: "Advanced SEO optimization with AI-powered suggestions, schema generation, and content scoring.", category: "SEO", icon: "📊", installed: false, active: false },
  { id: "ai-writer", name: "AI Writer Plus", author: "TechPivo Labs", version: "3.1.2", description: "Enhanced AI writing with multiple model support, fact verification, and tone adjustment.", category: "AI", icon: "✍️", installed: false, active: false },
  { id: "analytics-pro", name: "Analytics Pro", author: "TechPivo Labs", version: "1.8.0", description: "Deep analytics dashboard with real-time tracking, funnel analysis, and custom reports.", category: "Analytics", icon: "📈", installed: false, active: false },
  { id: "security-shield", name: "Security Shield", author: "TechPivo Labs", version: "2.0.1", description: "Comprehensive security monitoring, threat detection, and automated protection.", category: "Security", icon: "🛡️", installed: false, active: false },
  { id: "social-autopilot", name: "Social Autopilot", author: "TechPivo Labs", version: "1.5.3", description: "Automated social media publishing across all platforms with AI caption generation.", category: "Marketing", icon: "📱", installed: false, active: false },
  { id: "dev-tools", name: "Developer Toolkit", author: "TechPivo Labs", version: "1.2.0", description: "Collection of developer utilities: JSON formatter, regex tester, API tester, and more.", category: "Developer", icon: "🛠️", installed: false, active: false },
  { id: "integration-hub", name: "Integration Hub", author: "TechPivo Labs", version: "2.1.0", description: "Connect to 50+ services: Google, Mailchimp, Stripe, Slack, and more.", category: "Integrations", icon: "🔗", installed: false, active: false },
  { id: "content-optimizer", name: "Content Optimizer", author: "TechPivo Labs", version: "1.7.0", description: "AI-powered content optimization for readability, SEO, and engagement.", category: "SEO", icon: "🎯", installed: false, active: false },
  { id: "image-studio", name: "Image Studio", author: "TechPivo Labs", version: "1.3.0", description: "AI image generation, compression, resizing, and brand kit management.", category: "Marketing", icon: "🖼️", installed: false, active: false },
  { id: "performance-monitor", name: "Performance Monitor", author: "TechPivo Labs", version: "1.0.4", description: "Core Web Vitals monitoring, page speed tracking, and optimization suggestions.", category: "Analytics", icon: "⚡", installed: false, active: false },
  { id: "backup-pro", name: "Backup Pro", author: "TechPivo Labs", version: "1.1.0", description: "Automated backups with point-in-time recovery and cloud storage integration.", category: "Security", icon: "💾", installed: false, active: false },
  { id: "email-campaigns", name: "Email Campaigns", author: "TechPivo Labs", version: "2.0.0", description: "Newsletter management with A/B testing, segmentation, and automated sequences.", category: "Marketing", icon: "📧", installed: false, active: false },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const section = request.nextUrl.searchParams.get("section") || "marketplace";

    if (section === "marketplace") {
      const { data: installed } = await supabase
        .from("installed_plugins" as any)
        .select("plugin_id, active");

      const installedMap = new Map((installed || []).map((p: any) => [p.plugin_id, p.active]));

      const plugins = MARKETPLACE_PLUGINS.map((p) => ({
        ...p,
        installed: installedMap.has(p.id),
        active: installedMap.get(p.id) || false,
      }));

      return NextResponse.json({ plugins });
    }

    if (section === "installed") {
      const { data: installed, error } = await supabase
        .from("installed_plugins" as any)
        .select("*");

      if (error && error.code === "42P01") {
        return NextResponse.json({ plugins: [] });
      }

      const plugins = (installed || []).map((ip: any) => {
        const marketplace = MARKETPLACE_PLUGINS.find((p) => p.id === ip.plugin_id);
        return {
          id: ip.plugin_id,
          name: marketplace?.name || ip.plugin_id,
          author: marketplace?.author || "Unknown",
          version: marketplace?.version || "1.0.0",
          description: marketplace?.description || "",
          category: marketplace?.category || "Other",
          icon: marketplace?.icon || "📦",
          installed: true,
          active: ip.active,
          settings: ip.settings || {},
        };
      });

      return NextResponse.json({ plugins });
    }

    if (section === "updates") {
      return NextResponse.json({ plugins: [] });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action } = body;

    if (action === "install") {
      const { plugin_id } = body;
      if (!plugin_id) return NextResponse.json({ error: "plugin_id required" }, { status: 400 });

      const { error } = await supabase
        .from("installed_plugins" as any)
        .upsert({
          plugin_id,
          active: true,
          installed_at: new Date().toISOString(),
          settings: {},
        }, { onConflict: "plugin_id" });

      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "uninstall") {
      const { plugin_id } = body;
      if (!plugin_id) return NextResponse.json({ error: "plugin_id required" }, { status: 400 });

      const { error } = await supabase
        .from("installed_plugins" as any)
        .delete()
        .eq("plugin_id", plugin_id);

      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "toggle") {
      const { plugin_id, active } = body;
      if (!plugin_id) return NextResponse.json({ error: "plugin_id required" }, { status: 400 });

      const { error } = await supabase
        .from("installed_plugins" as any)
        .update({ active })
        .eq("plugin_id", plugin_id);

      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "update_settings") {
      const { plugin_id, settings } = body;
      if (!plugin_id) return NextResponse.json({ error: "plugin_id required" }, { status: 400 });

      const { error } = await supabase
        .from("installed_plugins" as any)
        .update({ settings })
        .eq("plugin_id", plugin_id);

      if (error && error.code !== "42P01") throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { plugin_id, settings } = body;

    if (!plugin_id) return NextResponse.json({ error: "plugin_id required" }, { status: 400 });

    const { error } = await supabase
      .from("installed_plugins" as any)
      .update({ settings })
      .eq("plugin_id", plugin_id);

    if (error && error.code !== "42P01") throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
