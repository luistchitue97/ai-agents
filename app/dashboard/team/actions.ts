"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { getWorkOS } from "@workos-inc/authkit-nextjs"
import { z } from "zod"

import { logAudit } from "@/lib/audit"
import { requireAdminContext } from "@/lib/auth"
import { notifyAdmins, notifyUser } from "@/lib/notifications"

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  roleSlug: z.enum(["admin", "member"]),
})

export async function sendInvite(input: z.infer<typeof inviteSchema>) {
  const data = inviteSchema.parse(input)
  const { user, organizationId } = await requireAdminContext()
  const workos = getWorkOS()

  const invitation = await workos.userManagement.sendInvitation({
    email: data.email,
    organizationId,
    roleSlug: data.roleSlug,
    inviterUserId: user.id,
  })

  await logAudit({
    action: "member.invited",
    targetType: "invitation",
    targetId: invitation.id,
    targetLabel: data.email,
    metadata: { roleSlug: data.roleSlug },
  })
  await notifyAdmins(
    organizationId,
    {
      type: "member.invited",
      title: `Invitation sent to ${data.email}`,
      body: `Role: ${data.roleSlug}.`,
      link: "/dashboard/team",
    },
    { exceptUserId: user.id }
  )

  revalidatePath("/dashboard/team")
}

export async function revokeInvite(invitationId: string) {
  const { organizationId } = await requireAdminContext()
  const workos = getWorkOS()

  const invitation = await workos.userManagement.getInvitation(invitationId)
  if (invitation.organizationId !== organizationId) {
    throw new Error("Invitation does not belong to your organization.")
  }

  await workos.userManagement.revokeInvitation(invitationId)
  await logAudit({
    action: "member.invite_revoked",
    targetType: "invitation",
    targetId: invitationId,
    targetLabel: invitation.email,
  })
  revalidatePath("/dashboard/team")
}

export async function resendInvite(invitationId: string) {
  const { organizationId } = await requireAdminContext()
  const workos = getWorkOS()

  const invitation = await workos.userManagement.getInvitation(invitationId)
  if (invitation.organizationId !== organizationId) {
    throw new Error("Invitation does not belong to your organization.")
  }

  await workos.userManagement.resendInvitation(invitationId)
  await logAudit({
    action: "member.invite_resent",
    targetType: "invitation",
    targetId: invitationId,
    targetLabel: invitation.email,
  })
  revalidatePath("/dashboard/team")
}

const roleChangeSchema = z.object({
  membershipId: z.string().min(1),
  roleSlug: z.enum(["admin", "member"]),
})

export async function changeMemberRole(input: z.infer<typeof roleChangeSchema>) {
  const data = roleChangeSchema.parse(input)
  const { organizationId } = await requireAdminContext()
  const workos = getWorkOS()

  // Verify the membership belongs to this org before mutating.
  const memberships = await workos.userManagement.listOrganizationMemberships({
    organizationId,
    limit: 100,
  })
  const target = memberships.data.find((m) => m.id === data.membershipId)
  if (!target) {
    throw new Error("Member not found in this organization.")
  }

  const previousRole = target.role?.slug ?? null
  await workos.userManagement.updateOrganizationMembership(data.membershipId, {
    roleSlug: data.roleSlug,
  })

  let targetLabel: string | undefined
  try {
    const targetUser = await workos.userManagement.getUser(target.userId)
    targetLabel = targetUser.email
  } catch {
    targetLabel = target.userId
  }

  await logAudit({
    action: "member.role_changed",
    targetType: "membership",
    targetId: data.membershipId,
    targetLabel,
    metadata: { previousRole, newRole: data.roleSlug },
  })
  await notifyUser(target.userId, organizationId, {
    type: "member.role_changed",
    title:
      data.roleSlug === "admin"
        ? "You're now an admin"
        : "Your role was updated",
    body: previousRole
      ? `Your role changed from ${previousRole} to ${data.roleSlug}.`
      : `Your role is now ${data.roleSlug}.`,
    link: "/dashboard/team",
  })
  revalidatePath("/dashboard/team")
}

export async function removeMember(membershipId: string) {
  const { user, organizationId } = await requireAdminContext()
  const workos = getWorkOS()

  const memberships = await workos.userManagement.listOrganizationMemberships({
    organizationId,
    limit: 100,
  })
  const target = memberships.data.find((m) => m.id === membershipId)
  if (!target) {
    throw new Error("Member not found in this organization.")
  }
  if (target.userId === user.id) {
    throw new Error("You can't remove yourself. Have another admin do it.")
  }

  let targetLabel: string | undefined
  try {
    const targetUser = await workos.userManagement.getUser(target.userId)
    targetLabel = targetUser.email
  } catch {
    targetLabel = target.userId
  }

  await workos.userManagement.deleteOrganizationMembership(membershipId)
  await logAudit({
    action: "member.removed",
    targetType: "membership",
    targetId: membershipId,
    targetLabel,
  })
  await notifyAdmins(
    organizationId,
    {
      type: "member.removed",
      title: `${targetLabel} was removed`,
      link: "/dashboard/team",
    },
    { exceptUserId: user.id }
  )
  revalidatePath("/dashboard/team")
}

const portalIntents = ["sso", "dsync", "audit_logs", "domain_verification"] as const
const portalLinkSchema = z.object({
  intent: z.enum(portalIntents),
})

export async function generatePortalLink(
  input: z.infer<typeof portalLinkSchema>
): Promise<{ link: string }> {
  const { intent } = portalLinkSchema.parse(input)
  const { organizationId } = await requireAdminContext()
  const workos = getWorkOS()

  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  const returnUrl = host ? `${proto}://${host}/dashboard/team` : undefined

  const { link } = await workos.adminPortal.generateLink({
    organization: organizationId,
    intent,
    returnUrl,
  })

  return { link }
}
