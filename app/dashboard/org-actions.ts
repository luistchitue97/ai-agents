"use server"

import { getWorkOS, switchToOrganization, withAuth } from "@workos-inc/authkit-nextjs"

export async function switchOrgAction(organizationId: string) {
  const { user } = await withAuth({ ensureSignedIn: true })
  const workos = getWorkOS()

  // Verify the user actually belongs to this org before switching.
  const memberships = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    statuses: ["active"],
    limit: 100,
  })
  const allowed = memberships.data.some((m) => m.organizationId === organizationId)
  if (!allowed) {
    throw new Error("You are not a member of that organization.")
  }

  await switchToOrganization(organizationId, { returnTo: "/dashboard" })
}
