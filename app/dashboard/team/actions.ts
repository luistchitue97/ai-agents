"use server"

import { revalidatePath } from "next/cache"
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs"
import { z } from "zod"

async function requireAdminContext() {
  const { user, organizationId, role } = await withAuth({ ensureSignedIn: true })
  if (!organizationId) {
    throw new Error("You must belong to an organization.")
  }
  if (role !== "admin") {
    throw new Error("Only organization admins can perform this action.")
  }
  return { user, organizationId }
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  roleSlug: z.enum(["admin", "member"]),
})

export async function sendInvite(input: z.infer<typeof inviteSchema>) {
  const data = inviteSchema.parse(input)
  const { user, organizationId } = await requireAdminContext()
  const workos = getWorkOS()

  await workos.userManagement.sendInvitation({
    email: data.email,
    organizationId,
    roleSlug: data.roleSlug,
    inviterUserId: user.id,
  })

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

  await workos.userManagement.updateOrganizationMembership(data.membershipId, {
    roleSlug: data.roleSlug,
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

  await workos.userManagement.deleteOrganizationMembership(membershipId)
  revalidatePath("/dashboard/team")
}
