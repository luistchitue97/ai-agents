import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs"

import { TeamPageClient, type Invite, type Member } from "./team-page-client"

export default async function TeamPage() {
  const { user, organizationId, role } = await withAuth({ ensureSignedIn: true })
  const isAdmin = role === "admin"

  const workos = getWorkOS()

  const [membershipPage, invitationPage] = await Promise.all([
    workos.userManagement.listOrganizationMemberships({
      organizationId: organizationId!,
      statuses: ["active", "inactive", "pending"],
      limit: 100,
    }),
    workos.userManagement.listInvitations({
      organizationId: organizationId!,
      limit: 100,
    }),
  ])

  // Enrich memberships with user details (N+1 — fine for small teams).
  const members: Member[] = await Promise.all(
    membershipPage.data.map(async (m): Promise<Member> => {
      const u = await workos.userManagement.getUser(m.userId)
      const displayName =
        [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email.split("@")[0]
      return {
        membershipId: m.id,
        userId: u.id,
        email: u.email,
        name: displayName,
        avatarUrl: u.profilePictureUrl,
        roleSlug: (m.role?.slug as "admin" | "member" | undefined) ?? "member",
        status: m.status,
        isYou: u.id === user.id,
      }
    })
  )

  // Sort: admins first, then alphabetical.
  members.sort((a, b) => {
    if (a.roleSlug !== b.roleSlug) return a.roleSlug === "admin" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const pendingInvites: Invite[] = invitationPage.data
    .filter((inv) => inv.state === "pending")
    .map((inv) => ({
      id: inv.id,
      email: inv.email,
      roleSlug: (inv.roleSlug as "admin" | "member" | null) ?? "member",
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }))

  return (
    <TeamPageClient
      isAdmin={isAdmin}
      members={members}
      pendingInvites={pendingInvites}
    />
  )
}
