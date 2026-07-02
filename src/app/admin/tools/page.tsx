"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Wrench, Code, Shield, Image, FileJson, Hash, Key,
  Type, Calculator, Globe, Lock, Search, FileText, Link2,
  Palette, Binary, Clock, Terminal, Braces, Minimize2,
} from "lucide-react"

interface Tool {
  name: string
  slug: string
  description: string
  icon: any
  category: string
  color: string
}

const tools: Tool[] = [
  { name: "JSON Formatter", slug: "json-formatter", description: "Format, validate, and beautify JSON data", icon: Braces, category: "Developer", color: "text-blue-500" },
  { name: "JSON Validator", slug: "json-validator", description: "Validate JSON syntax and structure", icon: FileJson, category: "Developer", color: "text-green-500" },
  { name: "Base64 Encoder", slug: "base64-encoder", description: "Encode and decode Base64 strings", icon: Binary, category: "Developer", color: "text-purple-500" },
  { name: "URL Encoder", slug: "url-encoder", description: "Encode and decode URLs", icon: Link2, category: "Developer", color: "text-cyan-500" },
  { name: "Hash Generator", slug: "hash-generator", description: "Generate MD5, SHA-1, SHA-256 hashes", icon: Hash, category: "Security", color: "text-red-500" },
  { name: "Password Generator", slug: "password-generator", description: "Generate secure random passwords", icon: Key, category: "Security", color: "text-amber-500" },
  { name: "Password Strength", slug: "password-strength", description: "Check password strength and security", icon: Shield, category: "Security", color: "text-green-500" },
  { name: "Email Validator", slug: "email-validator", description: "Validate email address format", icon: Lock, category: "Security", color: "text-pink-500" },
  { name: "Word Counter", slug: "word-counter", description: "Count words, characters, and sentences", icon: Type, category: "SEO", color: "text-orange-500" },
  { name: "Slug Generator", slug: "slug-generator", description: "Generate SEO-friendly URL slugs", icon: Globe, category: "SEO", color: "text-blue-500" },
  { name: "Meta Tag Generator", slug: "meta-tag-generator", description: "Generate meta tags for SEO", icon: Search, category: "SEO", color: "text-green-500" },
  { name: "Readability Checker", slug: "readability-checker", description: "Check content readability score", icon: FileText, category: "SEO", color: "text-purple-500" },
  { name: "Image Compressor", slug: "image-compressor", description: "Compress images without quality loss", icon: Image, category: "Image", color: "text-cyan-500" },
  { name: "Image Resizer", slug: "image-resizer", description: "Resize images to any dimension", icon: Minimize2, category: "Image", color: "text-pink-500" },
  { name: "Color Picker", slug: "color-picker", description: "Pick and convert color codes", icon: Palette, category: "Image", color: "text-amber-500" },
  { name: "Unit Converter", slug: "unit-converter", description: "Convert between measurement units", icon: Calculator, category: "Calculator", color: "text-green-500" },
  { name: "Percentage Calculator", slug: "percentage-calculator", description: "Calculate percentages quickly", icon: Calculator, category: "Calculator", color: "text-blue-500" },
  { name: "Date Calculator", slug: "date-calculator", description: "Calculate date differences", icon: Clock, category: "Calculator", color: "text-purple-500" },
]

const categories = ["All", "Developer", "Security", "SEO", "Image", "Calculator"]

export default function ToolsPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")

  const filtered = tools.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === "All" || t.category === category
    return matchSearch && matchCat
  })

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(tool => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.slug}
              href={`/admin/tools/${tool.slug}`}
              className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-5 hover:border-[#F59E0B] hover:shadow-lg transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg bg-gray-50 dark:bg-[#1F2937] group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 transition-colors`}>
                  <Icon className={`h-5 w-5 ${tool.color}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#F59E0B] transition-colors">{tool.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tool.description}</p>
                  <span className="inline-block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-2 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1F2937]">{tool.category}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center text-sm text-gray-400">
          <Wrench className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No tools found matching &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  )
}
