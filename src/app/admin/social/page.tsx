"use client"

import { SocialCalendar } from "@/components/admin/social-calendar"
import { AiCaptionStudio } from "@/components/admin/ai-caption-studio"
import { CampaignManager } from "@/components/admin/campaign-manager"

export default function SocialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Command Center</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage social media, captions, calendars, and campaigns</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AiCaptionStudio />
        <CampaignManager />
      </div>
      <SocialCalendar />
    </div>
  )
}
