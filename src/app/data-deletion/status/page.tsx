import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { CheckCircle, Clock, XCircle } from "lucide-react"
import Link from "next/link"

type Props = { searchParams: { code?: string } }

export default async function DataDeletionStatusPage({ searchParams }: Props) {
  const code = searchParams.code
  if (!code) notFound()

  const supabase = createClient()
  const { data } = await supabase
    .from("data_deletion_requests")
    .select("*")
    .eq("confirmation_code", code)
    .single()

  if (!data) notFound()

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      title: "Deletion Request Received",
      message: "Your data deletion request has been received and is being processed. This may take up to 30 days to complete.",
    },
    processing: {
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      title: "Processing Deletion",
      message: "Your data deletion request is currently being processed. We'll notify you once it's complete.",
    },
    completed: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-900/20",
      title: "Data Deletion Completed",
      message: "All your personal data associated with this account has been permanently deleted.",
    },
    failed: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      title: "Deletion Failed",
      message: "There was an issue processing your deletion request. Please contact support.",
    },
  } as const

  const config = statusConfig[data.status as keyof typeof statusConfig] || statusConfig.pending
  const Icon = config.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0F1E] px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-2xl shadow-sm p-8 text-center">
        <div className={`w-16 h-16 rounded-full ${config.bg} flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`h-8 w-8 ${config.color}`} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{config.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{config.message}</p>
        <div className="bg-gray-50 dark:bg-[#1a1f2e] rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Confirmation Code</span>
            <span className="font-mono text-xs text-gray-900 dark:text-white">{data.confirmation_code}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Requested</span>
            <span className="text-gray-900 dark:text-white">
              {new Date(data.requested_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Provider</span>
            <span className="text-gray-900 dark:text-white capitalize">{data.provider}</span>
          </div>
          {data.completed_at && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Completed</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(data.completed_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-medium rounded-lg transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
