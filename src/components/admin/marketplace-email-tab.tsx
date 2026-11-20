"use client"

import { useCallback, useEffect, useState } from "react"
import { MessageSquare, Edit2, Trash2, Plus, Mail, X, Send, RefreshCw } from "lucide-react"
import {
  marketBtnDarkCls,
  marketBtnGhostCls,
  marketBtnPrimaryCls,
  marketCardCls,
  marketInputCls,
  marketThCls,
  MarketBadge,
  MarketCardHead,
  MarketEmpty,
  MarketField,
  MarketKpi,
  MarketPageBar,
  MarketNotice,
  MarketTableShell,
} from "@/components/admin/marketplace-ui"
import { cn } from "@/lib/utils"

interface EmailTemplate {
  id: string
  name: string
  event_type: string
  subject: string
  html_content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface EmailLog {
  id: string
  template_id: string | null
  recipient_email: string
  event_type: string
  status: "sent" | "failed" | "delivered"
  provider_message_id: string | null
  error: string | null
  created_at: string
}

const STATUS_TONE: Record<string, "emerald" | "red" | "blue" | "neutral"> = {
  sent: "emerald",
  delivered: "emerald",
  failed: "red",
}

export function MarketplaceEmailTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warn" | "info">("info")

  // Template edit form
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState<{
    name: string
    event_type: string
    subject: string
    html_content: string
    is_active: boolean
  }>({ name: "", event_type: "", subject: "", html_content: "", is_active: true })

  const load = useCallback(async () => {
    setLoading(true)
    setNotice("")
    try {
      const [tRes, lRes] = await Promise.all([
        fetch("/admin/marketplace/api?section=email-templates").then((r) => r.json()),
        fetch("/admin/marketplace/api?section=email-logs&limit=200").then((r) => r.json()),
      ])
      if (tRes?.error) throw new Error(tRes.error)
      if (lRes?.error) throw new Error(lRes.error)
      setTemplates(Array.isArray(tRes?.templates) ? tRes.templates : [])
      setLogs(Array.isArray(lRes?.logs) ? lRes.logs : [])
    } catch {
      setNoticeTone("warn")
      setNotice("Could not load email settings.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalTemplates = templates.length
  const activeTemplates = templates.filter((t) => t.is_active).length
  const totalLogs = logs.length
  const failedLogs = logs.filter((l) => l.status === "failed").length

  // ---------- template actions ----------
  const startAddTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({ name: "", event_type: "", subject: "", html_content: "", is_active: true })
  }

  const startEditTemplate = (t: EmailTemplate) => {
    setEditingTemplate(t)
    setTemplateForm({ ...t })
  }

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.event_type.trim() || !templateForm.subject.trim()) {
      setNoticeTone("warn")
      setNotice("Name, event type and subject are required.")
      return
    }
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "email-templates-save",
          id: editingTemplate?.id || "",
          name: templateForm.name.trim(),
          event_type: templateForm.event_type.trim(),
          subject: templateForm.subject.trim(),
          html_content: templateForm.html_content,
          is_active: templateForm.is_active,
        }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Email template saved.")
        setEditingTemplate(null)
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Save failed.")
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Delete this email template?")) return
    try {
      const r = await fetch("/admin/marketplace/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email-templates-delete", id }),
      }).then((x) => x.json())
      if (r?.error) {
        setNoticeTone("warn")
        setNotice(r.error)
      } else {
        setNoticeTone("success")
        setNotice("Template removed.")
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Delete failed.")
    }
  }

  // ---------- retry failed logs ----------
  const retryLog = async (log: EmailLog) => {
    if (!log.template_id) {
      setNoticeTone("warn")
      setNotice("No template to retry from.")
      return
    }
    try {
      const r = await fetch("/api/marketplace/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: log.recipient_email,
          template_id: log.template_id,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.error) {
        setNoticeTone("warn")
        setNotice(j.error || "Retry failed.")
      } else {
        setNoticeTone("success")
        setNotice(`Retry sent to ${log.recipient_email}.`)
        load()
      }
    } catch {
      setNoticeTone("warn")
      setNotice("Retry failed.")
    }
  }

  const EVENT_TYPES = [
    "order_placed", "payment_successful", "payment_failed", "order_processing",
    "order_shipped", "tracking_available", "in_transit", "out_for_delivery",
    "delivered", "delivery_exception", "order_cancelled", "refund_initiated",
    "refund_completed", "abandoned_cart", "back_in_stock", "seller_order_notification",
    "welcome", "email_verification", "password_reset", "promotional",
  ]

  return (
    <div>
      <MarketPageBar
        icon={Mail}
        title="Email Management"
        desc="Branded email templates per event and a log of every send. Failed deliveries can be retried one at a time."
        badge={
          <MarketBadge tone="emerald" dot>
            Branded
          </MarketBadge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-3">
        <MarketKpi label="Templates" value={totalTemplates.toString()} sub={activeTemplates + " active"} icon={MessageSquare} />
        <MarketKpi label="Sent (200)" value={totalLogs.toString()} sub={failedLogs + " failed"} icon={Send} />
        <MarketKpi label="Success rate" value={
          totalLogs > 0 ? Math.round(((totalLogs - failedLogs) / totalLogs) * 100) + "%" : "—"
        } sub="of recent sends" />
      </div>

      {/* ---------- Templates ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead
          title="Email templates"
          desc="One template per notification event. Edit subject + HTML; preview renders on the storefront emails."
          icon={MessageSquare}
        />
        <div className="flex items-end gap-2 mb-3">
          <button onClick={startAddTemplate} disabled={loading} className={marketBtnPrimaryCls}>
            <Plus className="h-4 w-4" /> New template
          </button>
        </div>
        {templates.length === 0 ? (
          <MarketEmpty icon={MessageSquare} title="No templates" desc="Create your first branded email template." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Name</th>
                  <th className={marketThCls}>Event</th>
                  <th className={cn(marketThCls, "text-left")}>Subject</th>
                  <th className={cn(marketThCls, "text-center")}>Active</th>
                  <th className={marketThCls} w-40>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 group">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 truncate max-w-[150px] block">{t.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="text-[10px] uppercase tracking-wider">{t.event_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-900 truncate max-w-[260px] block">"{t.subject}"</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <MarketBadge tone={t.is_active ? "emerald" : "neutral"}>
                        {t.is_active ? "On" : "Off"}
                      </MarketBadge>
                    </td>
                    <td className="px-4 py-3 textRight">
                      <button
                        onClick={() => startEditTemplate(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="ml-2 p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editingTemplate && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-amber-900">
                  {editingTemplate ? `Edit: ${editingTemplate.name}` : "New template"}
                </h3>
                <p className="text-[11px] text-amber-700">Event type determines when this email fires.</p>
              </div>
              <button onClick={() => setEditingTemplate(null)} className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <MarketField label="Template name">
                <input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Event type">
                <select
                  value={templateForm.event_type}
                  onChange={(e) => setTemplateForm({ ...templateForm, event_type: e.target.value })}
                  className={marketInputCls}
                >
                  {EVENT_TYPES.map((e) => (
                    <option key={e} value={e}>
                      {e.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </MarketField>
              <MarketField label="Subject">
                <input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className={marketInputCls}
                />
              </MarketField>
              <MarketField label="Active">
                <select
                  value={templateForm.is_active ? "true" : "false"}
                  onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.value === "true" })}
                  className={marketInputCls}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </MarketField>
              <MarketField label="HTML body" hint="Full HTML email body">
                <textarea
                  value={templateForm.html_content}
                  onChange={(e) => setTemplateForm({ ...templateForm, html_content: e.target.value })}
                  rows={6}
                  className={marketInputCls + " h-32 font-mono text-xs"}
                />
              </MarketField>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setEditingTemplate(null)} className={marketBtnGhostCls}>
                Cancel
              </button>
              <button onClick={saveTemplate} disabled={loading} className={marketBtnPrimaryCls}>
                {loading ? "Saving…" : "Save template"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Send logs ---------- */}
      <div className={marketCardCls + " p-4 sm:p-5 mb-3"}>
        <MarketCardHead
          title="Send log (last 200)"
          desc="Every branded email sent, with delivery status. Retry failed sends to resend immediately."
          icon={RefreshCw}
        />
        {logs.length === 0 ? (
          <MarketEmpty icon={Mail} title="No sends yet" desc="Emails appear here once customers receive them." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={marketThCls}>Recipient</th>
                  <th className={marketThCls}>Event</th>
                  <th className={cn(marketThCls, "text-center")}>Status</th>
                  <th className={cn(marketThCls, "text-left")}>Error</th>
                  <th className={cn(marketThCls, "text-right")}>Sent</th>
                  <th className={marketThCls} w-40>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 group">
                    <td className="px-4 py-3">
                      <span className="text-slate-900 truncate max-w-[160px] block">{l.recipient_email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="text-[10px] uppercase tracking-wider">{l.event_type}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <MarketBadge tone={STATUS_TONE[l.status] || "neutral"}>{l.status}</MarketBadge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-red-500 truncate max-w-[200px] block">{l.error || "—"}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right text-slate-500">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 textRight">
                      {l.status === "failed" ? (
                        <button
                          onClick={() => retryLog(l)}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          <Send className="h-3 w-3 mr-1" /> Retry
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notice && <MarketNotice tone={noticeTone}>{notice}</MarketNotice>}
    </div>
  )
}
