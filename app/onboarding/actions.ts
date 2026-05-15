"use server"

import { getWorkOS, switchToOrganization, withAuth } from "@workos-inc/authkit-nextjs"
import { z } from "zod"

const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name must be 60 characters or fewer"),
})

export async function createOrganization(input: z.infer<typeof createOrgSchema>) {
  const data = createOrgSchema.parse(input)
  const { user } = await withAuth({ ensureSignedIn: true })

  const workos = getWorkOS()

  const org = await workos.organizations.createOrganization({ name: data.name })

  await workos.userManagement.createOrganizationMembership({
    organizationId: org.id,
    userId: user.id,
    roleSlug: "admin",
  })

  // Refreshes the session with the new org context, then redirects to returnTo.
  await switchToOrganization(org.id, { returnTo: "/dashboard" })
}
