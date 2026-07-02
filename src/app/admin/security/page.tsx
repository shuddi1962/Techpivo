"use client"

import { SecurityDashboard } from "@/components/admin/security-dashboard"
import { AuditLogViewer } from "@/components/admin/audit-log-viewer"
import { ApiKeyManager } from "@/components/admin/api-key-manager"

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Center</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor security, audit logs, and API keys</p>
      </div>
      <SecurityDashboard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AuditLogViewer />
        <ApiKeyManager />
      </div>
    </div>
  )
}
