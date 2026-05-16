import "server-only"

import { withAuth } from "@workos-inc/authkit-nextjs"
import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export type AuditAction =
  | "agent.created"
  | "agent.deleted"
  | "agent.configured"
  | "integration.connected"
  | "integration.disconnected"
  | "member.invited"
  | "member.invite_revoked"
  | "member.invite_resent"
  | "member.role_changed"
  | "member.removed"

type LogInput = {
  action: AuditAction
  targetType?: string
  targetId?: string
  targetLabel?: string
  metadata?: Prisma.InputJsonValue
}

/**
 * Records an audit event for the current actor + their active org.
 * Never throws: an audit failure must not break the user-facing action
 * that triggered it. Errors are logged to the server console only.
 */
export async function logAudit(input: LogInput): Promise<void> {
  try {
    const { user, organizationId } = await withAuth()
    if (!user || !organizationId) return

    const actorName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email.split("@")[0]

    await prisma.auditEvent.create({
      data: {
        organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetLabel: input.targetLabel,
        metadata: input.metadata,
      },
    })
  } catch (err) {
    console.error("[audit] failed to record event", input.action, err)
  }
}
