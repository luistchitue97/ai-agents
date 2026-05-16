import { withAuth } from "@workos-inc/authkit-nextjs"

/**
 * Ensures the request comes from a signed-in user who belongs to an
 * organization. Returns the user + organizationId.
 */
export async function requireOrgContext() {
  const { user, organizationId, role } = await withAuth({ ensureSignedIn: true })
  if (!organizationId) {
    throw new Error("You must belong to an organization to perform this action.")
  }
  return { user, organizationId, role }
}

/**
 * Like requireOrgContext, but additionally requires the caller's role
 * in the current organization to be "admin".
 */
export async function requireAdminContext() {
  const ctx = await requireOrgContext()
  if (ctx.role !== "admin") {
    throw new Error("Only organization admins can perform this action.")
  }
  return ctx
}
