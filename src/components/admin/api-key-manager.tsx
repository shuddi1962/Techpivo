"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Key, Plus, Trash2, Copy, Eye, EyeOff, RefreshCw,
  Shield, Clock, CheckCircle, XCircle,
} from "lucide-react"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  disabled: boolean
  last_used_at: string
  expires_at: string
  created_at: string
}

export function ApiKeyManager() {
  const supabase = createClient()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState({ name: "", permissions: ["read"], expire_days: 90 })
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, permissions, disabled, last_used_at, expires_at, created_at")
      .order("created_at", { ascending: false })

    setKeys(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const createKey = async () => {
    const prefix = "tp_" + Math.random().toString(36).slice(2, 10)
    const fullKey = prefix + Math.random().toString(36).slice(2, 34)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + newKey.expire_days)

    await supabase.from("api_keys").insert({
      name: newKey.name,
      key_prefix: prefix,
      key_hash: fullKey,
      permissions: newKey.permissions,
      expires_at: expiresAt.toISOString(),
    })

    setRevealedKey(fullKey)
    setNewKey({ name: "", permissions: ["read"], expire_days: 90 })
    setShowCreate(false)
    fetchKeys()
  }

  const deleteKey = async (id: string) => {
    await supabase.from("api_keys").delete().eq("id", id)
    fetchKeys()
  }

  const toggleKey = async (id: string, disabled: boolean) => {
    await supabase.from("api_keys").update({ disabled: !disabled }).eq("id", id)
    fetchKeys()
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
  }

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Key className="h-5 w-5 text-[#F59E0B]" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">API Keys</h2>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Create Key
        </button>
      </div>

      {revealedKey && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">API Key Created</div>
              <code className="text-xs text-green-800 dark:text-green-300 break-all">{revealedKey}</code>
            </div>
            <div className="flex gap-1">
              <button onClick={() => copyKey(revealedKey)} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/40 rounded">
                <Copy className="h-4 w-4 text-green-600 dark:text-green-400" />
              </button>
              <button onClick={() => setRevealedKey(null)} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/40 rounded">
                <XCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-green-600 dark:text-green-500 mt-2">Copy this key now. It won&apos;t be shown again.</p>
        </div>
      )}

      {showCreate && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-[#374151] space-y-3">
          <input
            type="text"
            value={newKey.name}
            onChange={e => setNewKey({ ...newKey, name: e.target.value })}
            placeholder="Key name (e.g., Production API)"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-900 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {["read", "write", "admin"].map(perm => (
                  <label key={perm} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={newKey.permissions.includes(perm)}
                      onChange={e => {
                        if (e.target.checked) setNewKey({ ...newKey, permissions: [...newKey.permissions, perm] })
                        else setNewKey({ ...newKey, permissions: newKey.permissions.filter(p => p !== perm) })
                      }}
                      className="rounded border-gray-300"
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expires in (days)</label>
              <select
                value={newKey.expire_days}
                onChange={e => setNewKey({ ...newKey, expire_days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#374151] rounded-lg text-gray-700 dark:text-gray-300"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createKey} disabled={!newKey.name} className="px-4 py-2 text-sm font-semibold bg-[#F59E0B] text-white rounded-lg disabled:opacity-50">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#374151] rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-sm text-gray-400">
          <Key className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p>No API keys yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(key => (
            <div key={key.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-[#374151] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1F2937]">
              <div className="flex items-center gap-3">
                <Key className={`h-4 w-4 ${key.disabled ? "text-gray-300 dark:text-gray-600" : "text-[#F59E0B]"}`} />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {key.name}
                    {key.disabled ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Disabled</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-3 mt-0.5">
                    <span>{key.key_prefix}...</span>
                    <span>{key.permissions?.join(", ")}</span>
                    {key.last_used_at && <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleKey(key.id, key.disabled)}
                  className={`p-1.5 rounded-lg ${key.disabled ? "hover:bg-green-50 dark:hover:bg-green-900/20" : "hover:bg-yellow-50 dark:hover:bg-yellow-900/20"}`}>
                  {key.disabled ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-yellow-400" />}
                </button>
                <button onClick={() => deleteKey(key.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
