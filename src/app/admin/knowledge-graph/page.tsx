"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Network, Plus, Search, Filter, Trash2, Edit3,
  Building2, Cpu, Globe, Smartphone, Code, Users, X,
} from "lucide-react"

interface KnowledgeEntity {
  id: string
  name: string
  entity_type: string
  description: string
  metadata: any
  created_at: string
}

const ENTITY_TYPES = [
  { value: "company", label: "Company", icon: Building2 },
  { value: "product", label: "Product", icon: Smartphone },
  { value: "technology", label: "Technology", icon: Code },
  { value: "person", label: "Person", icon: Users },
  { value: "framework", label: "Framework", icon: Globe },
  { value: "ai_model", label: "AI Model", icon: Cpu },
]

export default function KnowledgeGraphPage() {
  const supabase = createClient()
  const [entities, setEntities] = useState<KnowledgeEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [newEntity, setNewEntity] = useState({ name: "", entity_type: "company", description: "" })

  const fetchEntities = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("knowledge_entities")
      .select("*")
      .order("name", { ascending: true })

    if (typeFilter) query = query.eq("entity_type", typeFilter)
    if (search) query = query.ilike("name", `%${search}%`)

    const { data } = await query
    setEntities(data || [])
    setLoading(false)
  }, [typeFilter, search])

  useEffect(() => { fetchEntities() }, [fetchEntities])

  const createEntity = async () => {
    if (!newEntity.name) return
    await supabase.from("knowledge_entities").insert(newEntity)
    setNewEntity({ name: "", entity_type: "company", description: "" })
    setShowCreate(false)
    fetchEntities()
  }

  const deleteEntity = async (id: string) => {
    await supabase.from("knowledge_entities").delete().eq("id", id)
    fetchEntities()
  }

  const typeIcon = (type: string) => {
    const found = ENTITY_TYPES.find(t => t.value === type)
    if (!found) return <Globe className="h-4 w-4 text-gray-400" />
    const Icon = found.icon
    return <Icon className="h-4 w-4 text-[#F59E0B]" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Graph</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage entities, relationships, and article connections</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Entity
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newEntity.name}
              onChange={e => setNewEntity({ ...newEntity, name: e.target.value })}
              placeholder="Entity name"
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white"
            />
            <select
              value={newEntity.entity_type}
              onChange={e => setNewEntity({ ...newEntity, entity_type: e.target.value })}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-700 dark:text-gray-300"
            >
              {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="text"
              value={newEntity.description}
              onChange={e => setNewEntity({ ...newEntity, description: e.target.value })}
              placeholder="Description"
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={createEntity} className="px-4 py-2 text-sm font-semibold bg-[#F59E0B] text-white rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#374151] rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entities..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-lg text-gray-700 dark:text-gray-300"
        >
          <option value="">All Types</option>
          {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : entities.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-sm text-gray-400">
          <Network className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No entities yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map(entity => (
            <div key={entity.id} className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-4 hover:border-[#F59E0B] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {typeIcon(entity.entity_type)}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{entity.name}</h3>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 capitalize">{entity.entity_type?.replace("_", " ")}</span>
                  </div>
                </div>
                <button onClick={() => deleteEntity(entity.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
              {entity.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{entity.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
