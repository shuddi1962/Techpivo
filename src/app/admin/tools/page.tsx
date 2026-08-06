"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Wrench, Code, Shield, Image, FileJson, Hash, Key,
  Type, Calculator, Globe, Lock, Search, FileText, Link2,
  Palette, Binary, Clock, Terminal, Braces, Minimize2,
  CheckCircle, Unlock, Server, Tags, Layout, Bot, Map,
  BookOpen, Eye, RefreshCw, Maximize, Scissors, Percent,
  Repeat, DollarSign, Sparkles, User, HelpCircle, Mail,
  LucideIcon,
} from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  code: Code, "check-circle": CheckCircle, lock: Lock, unlock: Unlock,
  link: Link2, hash: Hash, key: Key, shield: Shield, mail: Mail,
  globe: Globe, server: Server, search: Search, tags: Tags, layout: Layout,
  bot: Bot, map: Map, "book-open": BookOpen, type: Type, eye: Eye,
  image: Image, "refresh-cw": RefreshCw, maximize: Maximize, scissors: Scissors,
  palette: Palette, "file-text": FileText, minimize: Minimize2, file: FileText,
  "dollar-sign": DollarSign, percent: Percent, repeat: Repeat,
  sparkles: Sparkles, user: User, "help-circle": HelpCircle,
}

const CATEGORY_COLORS: Record<string, string> = {
  developer: "text-blue-500", security: "text-red-500", seo: "text-orange-500",
  image: "text-cyan-500", networking: "text-purple-500", pdf: "text-pink-500",
  calculator: "text-green-500", ai: "text-amber-500",
}

const CATEGORY_LABELS: Record<string, string> = {
  developer: "Developer", security: "Security", seo: "SEO",
  image: "Image", networking: "Networking", pdf: "PDF",
  calculator: "Calculator", ai: "AI",
}

interface Tool {
  id: string
  name: string
  slug: string
  description: string
  category: string
  icon: string
  is_active: boolean
  is_ai_tool: boolean
  usage_count: number
}

export default function ToolsPage() {
  const supabase = createClient()
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")

  const fetchTools = useCallback(async () => {
    const { data } = await supabase
      .from("tools")
      .select("*")
      .eq("is_active", true)
      .order("usage_count", { ascending: false })
    setTools(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchTools() }, [fetchTools])

  const categories = ["All", ...new Set(tools.map(t => CATEGORY_LABELS[t.category] || t.category))]

  const filtered = tools.filter(t => {
    const cat = CATEGORY_LABELS[t.category] || t.category
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === "All" || cat === category
    return matchSearch && matchCat
  })

  const getIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || Wrench
    return <Icon className="h-5 w-5" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tools & Utilities</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Free developer, SEO, security, and image tools</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                category === cat ? "bg-[#F59E0B] text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2937] border border-gray-200 dark:border-[#374151]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tool => {
            const color = CATEGORY_COLORS[tool.category] || "text-gray-500"
            return (
              <Link
                key={tool.id}
                href={`/admin/tools/${tool.slug}`}
                className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-5 hover:border-[#F59E0B] hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg bg-gray-50 dark:bg-[#1F2937] group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 transition-colors ${color}`}>
                    {getIcon(tool.icon)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#F59E0B] transition-colors">{tool.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tool.description}</p>
                    <span className="inline-block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-2 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1F2937]">
                      {CATEGORY_LABELS[tool.category] || tool.category}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center text-sm text-gray-400">
          <Wrench className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No tools found matching &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  )
}
