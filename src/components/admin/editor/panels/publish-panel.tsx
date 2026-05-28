"use client"

import { useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Save, Send, Clock, CheckCircle2, XCircle } from "lucide-react"

export function PublishPanel() {
  const { post, updatePost, isSaving, lastSaved, saveDraft, publish, schedule, dirty } = usePostEditor()
  const [scheduling, setScheduling] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")

  const handleSchedule = () => {
    if (scheduleDate) {
      schedule(new Date(scheduleDate).toISOString())
      setScheduling(false)
    }
  }

  return (
    <CollapsibleSection title="Publish" icon={<Send className="h-4 w-4" />}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-[#9CA3AF] font-medium">Status</span>
          <span className={`text-sm font-semibold flex items-center gap-1.5 ${
            post.status === "published" ? "text-green-600 dark:text-green-400" :
            post.status === "draft" ? "text-amber-600 dark:text-amber-400" :
            post.status === "scheduled" ? "text-indigo-600 dark:text-indigo-400" :
            "text-gray-500 dark:text-[#6B7280]"
          }`}>
            {post.status === "published" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
             post.status === "draft" ? <XCircle className="h-3.5 w-3.5" /> :
             <Clock className="h-3.5 w-3.5" />}
            {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-[#9CA3AF] font-medium">Visibility</span>
          <select
            value={post.status === "published" ? "public" : post.status === "scheduled" ? "scheduled" : "draft"}
            onChange={(e) => updatePost({ status: e.target.value as "draft" | "published" | "scheduled" })}
            className="bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent font-medium"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-[#9CA3AF] font-medium">Stick to front page</span>
          <Switch
            checked={post.is_sticky}
            onCheckedChange={(v) => updatePost({ is_sticky: v })}
          />
        </div>

        <div className="border-t-2 border-gray-100 dark:border-[#1F2937] pt-4 space-y-2.5">
          <Button
            onClick={saveDraft}
            disabled={isSaving}
            variant="outline"
            className="w-full border-2 border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#1a2235] text-gray-700 dark:text-gray-200 font-medium"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>

          <Button
            onClick={publish}
            disabled={isSaving}
            className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold shadow-sm shadow-[#F59E0B]/20"
          >
            <Send className="h-4 w-4 mr-2" />
            Publish
          </Button>

          {!scheduling ? (
            <Button
              onClick={() => setScheduling(true)}
              variant="outline"
              className="w-full border-2 border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#1a2235] text-gray-700 dark:text-gray-200 font-medium"
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          ) : (
            <div className="space-y-2.5">
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#0A0F1E] border-2 border-gray-300 dark:border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              />
              <div className="flex gap-2">
                <Button onClick={handleSchedule} size="sm" className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-white font-medium text-xs shadow-sm">
                  Confirm
                </Button>
                <Button onClick={() => setScheduling(false)} size="sm" variant="outline" className="border-2 border-gray-300 dark:border-[#374151] text-gray-600 dark:text-gray-400 text-xs font-medium">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {lastSaved && (
          <p className="text-xs text-gray-400 dark:text-[#6B7280] text-center">
            Last saved: {lastSaved.toLocaleTimeString()}
            {dirty && " (unsaved changes)"}
          </p>
        )}
      </div>
    </CollapsibleSection>
  )
}
