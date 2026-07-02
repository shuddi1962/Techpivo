"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  FolderKanban, Plus, Calendar, Eye, Share2, TrendingUp,
  BarChart3, Trash2, Edit3, ChevronDown, ChevronUp,
} from "lucide-react"

interface Campaign {
  id: string
  name: string
  description: string
  status: string
  start_date: string
  end_date: string
  created_at: string
  post_count?: number
  total_views?: number
}

export function CampaignManager() {
  const supabase = createClient()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "", start_date: "", end_date: "" })

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    setCampaigns(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const createCampaign = async () => {
    if (!newCampaign.name) return
    await supabase.from("campaigns").insert({
      name: newCampaign.name,
      description: newCampaign.description,
      status: "active",
      start_date: newCampaign.start_date || new Date().toISOString(),
      end_date: newCampaign.end_date,
    })
    setNewCampaign({ name: "", description: "", start_date: "", end_date: "" })
    setShowCreate(false)
    fetchCampaigns()
  }

  const deleteCampaign = async (id: string) => {
    await supabase.from("campaigns").delete().eq("id", id)
    fetchCampaigns()
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "completed": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "paused": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <FolderKanban className="h-5 w-5 text-[#F59E0B]" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Campaign Manager</h2>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Campaign
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-[#374151] space-y-3">
          <input
            type="text"
            value={newCampaign.name}
            onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
            placeholder="Campaign name"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white"
          />
          <textarea
            value={newCampaign.description}
            onChange={e => setNewCampaign({ ...newCampaign, description: e.target.value })}
            placeholder="Description"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={newCampaign.start_date}
              onChange={e => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
              className="px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white"
            />
            <input
              type="date"
              value={newCampaign.end_date}
              onChange={e => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
              className="px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={createCampaign} className="px-4 py-2 text-sm font-semibold bg-[#F59E0B] text-white rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#374151] rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-sm text-gray-400">
          <FolderKanban className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No campaigns yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="border border-gray-200 dark:border-[#374151] rounded-lg">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1F2937]"
                onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{campaign.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{campaign.description?.slice(0, 60)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id) }} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                  {expandedId === campaign.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>
              {expandedId === campaign.id && (
                <div className="px-3 pb-3 border-t border-gray-100 dark:border-[#374151] pt-3 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{campaign.post_count || 0}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Posts</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{(campaign.total_views || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Views</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "—"}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Start Date</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
