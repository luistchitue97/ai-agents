import "server-only"

import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs"

import { prisma } from "@/lib/prisma"

export type NotificationKind =
  | "agent.created"
  | "agent.run_failed"
  | "integration.connected"
  | "member.role_changed"
  | "member.invited"
  | "member.removed"

type Payload = {
  type: NotificationKind
  title: string
  body?: string
  link?: string
}

/**
 * Send a notification to a single recipient (WorkOS user id).
 * Never throws — notification failures must not break the action that triggered them.
 */
export async function notifyUser(
  recipientId: string,
  organizationId: string,
  payload: Payload
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        organizationId,
        recipientId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link,
      },
    })
  } catch (err) {
    console.error("[notify] failed to notify user", recipientId, payload.type, err)
  }
}

/**
 * Send the same notification to every active member of an organization.
 * If `exceptUserId` is provided (typically the actor), that user is skipped so
 * they don't notify themselves.
 */
export async function notifyOrg(
  organizationId: string,
  payload: Payload,
  options?: { exceptUserId?: string }
): Promise<void> {
  try {
    const workos = getWorkOS()
    const memberships = await workos.userManagement.listOrganizationMemberships({
      organizationId,
      statuses: ["active"],
      limit: 100,
    })
    const recipientIds = memberships.data
      .map((m) => m.userId)
      .filter((id) => id !== options?.exceptUserId)
    if (recipientIds.length === 0) return
    await prisma.notification.createMany({
      data: recipientIds.map((recipientId) => ({
        organizationId,
        recipientId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link,
      })),
    })
  } catch (err) {
    console.error("[notify] failed to notify org", organizationId, payload.type, err)
  }
}

/**
 * Send to admin-role members only. Useful for audit-style alerts that
 * non-admins don't need to see (member invited, member removed).
 */
export async function notifyAdmins(
  organizationId: string,
  payload: Payload,
  options?: { exceptUserId?: string }
): Promise<void> {
  try {
    const workos = getWorkOS()
    const memberships = await workos.userManagement.listOrganizationMemberships({
      organizationId,
      statuses: ["active"],
      limit: 100,
    })
    const recipientIds = memberships.data
      .filter((m) => m.role?.slug === "admin")
      .map((m) => m.userId)
      .filter((id) => id !== options?.exceptUserId)
    if (recipientIds.length === 0) return
    await prisma.notification.createMany({
      data: recipientIds.map((recipientId) => ({
        organizationId,
        recipientId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link,
      })),
    })
  } catch (err) {
    console.error("[notify] failed to notify admins", organizationId, payload.type, err)
  }
}

/**
 * Resolve the current actor's user id from the session, useful as the
 * `exceptUserId` argument when fanning out to the rest of the org.
 */
export async function currentActorId(): Promise<string | undefined> {
  try {
    const { user } = await withAuth()
    return user?.id
  } catch {
    return undefined
  }
}
