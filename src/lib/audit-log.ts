import { createServiceClient } from "@/lib/admin-auth"

/**
 * Structured audit logger — inserts into audit_logs for security-sensitive events.
 * Spec §33: login, logout, failed login, role changes, publication, deletion, uploads, security violations.
 */
export async function auditLog(opts: {
  user_id?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | null
  details?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
}): Promise<void> {
  try {
    const service = createServiceClient()
    await service.from("audit_logs").insert({
      user_id: opts.user_id ?? null,
      action: opts.action,
      entity_type: opts.entity_type ?? null,
      entity_id: opts.entity_id ?? null,
      details: opts.details ?? {},
      ip_address: opts.ip_address ?? null,
      user_agent: opts.user_agent ?? null,
    })
  } catch {
    // Audit logging must never break the request flow
  }
}
