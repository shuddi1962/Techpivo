"use client"

import { useState } from "react"
import { usePostEditor } from "../post-editor-provider"
import { CollapsibleSection } from "../collapsible-section"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Save, Send, Eye, Clock, CheckCircle2, XCircle } from "lucide-react"

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

  const statusColors: Record<string, string> = {
    draft: "text-[#F59E0B]",
    published: "text-[#10B981]",
    scheduled: "text-[#6366F1]",
    archived: "text-[#6B7280]",
  }

  return (
    <CollapsibleSection
      title="Publish"
      icon={<Send className="h-4 w-4" />}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#9CA3AF]">Status</span>
          <span className={`text-sm font-medium flex items-center gap-1 ${statusColors[post.status]}`}>
            {post.status === "published" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
             post.status === "draft" ? <XCircle className="h-3.5 w-3.5" /> :
             <Clock className="h-3.5 w-3.5" />}
            {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#9CA3AF]">Visibility</span>
          <select
            value={post.status === "published" ? "public" : post.status === "scheduled" ? "scheduled" : "draft"}
            onChange={(e) => updatePost({ status: e.target.value as "draft" | "published" | "scheduled" })}
            className="bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1]"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#9CA3AF]">Stick to front page</span>
          <Switch
            checked={post.is_sticky}
            onCheckedChange={(v) => updatePost({ is_sticky: v })}
          />
        </div>

        <div className="border-t border-[#1F2937] pt-3 space-y-2">
          <Button
            onClick={saveDraft}
            disabled={isSaving}
            variant="outline"
            className="w-full border-[#1F2937] hover:bg-[#1a2235] text-[#F9FAFB]"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>

          <Button
            onClick={publish}
            disabled={isSaving}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            Publish
          </Button>

          {!scheduling ? (
            <Button
              onClick={() => setScheduling(true)}
              variant="outline"
              className="w-full border-[#1F2937] hover:bg-[#1a2235] text-[#F9FAFB]"
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          ) : (
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded px-2 py-1.5 text-sm text-[#F9FAFB] focus:outline-none focus:border-[#6366F1]"
              />
              <div className="flex gap-2">
                <Button onClick={handleSchedule} size="sm" className="flex-1 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs">
                  Confirm
                </Button>
                <Button onClick={() => setScheduling(false)} size="sm" variant="outline" className="border-[#1F2937] text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {lastSaved && (
          <p className="text-xs text-[#6B7280] text-center">
            Last saved: {lastSaved.toLocaleTimeString()}
            {dirty && " (unsaved changes)"}
          </p>
        )}
      </div>
    </CollapsibleSection>
  )
}
