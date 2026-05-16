import { NextResponse, type NextRequest } from "next/server"
import { withAuth } from "@workos-inc/authkit-nextjs"

import { logAudit } from "@/lib/audit"
import { encryptSecret } from "@/lib/crypto"
import { getProvider } from "@/lib/integrations/providers"
import { notifyOrg } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

const STATE_COOKIE = "integration_oauth_state"

function fail(request: NextRequest, message: string) {
  const url = new URL("/dashboard/integrations", request.url)
  url.searchParams.set("error", message)
  return NextResponse.redirect(url)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params
  const provider = getProvider(providerId)
  if (!provider.oauth) return fail(request, "provider_unsupported")

  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const cookieState = request.cookies.get(STATE_COOKIE)?.value

  if (!code) return fail(request, "missing_code")
  if (!state || !cookieState || state !== cookieState) return fail(request, "state_mismatch")

  const { user, organizationId } = await withAuth({ ensureSignedIn: true })
  if (!organizationId) {
    return NextResponse.redirect(new URL("/onboarding/organization", request.url))
  }

  const clientId = process.env[`${providerId.toUpperCase()}_CLIENT_ID`]
  const clientSecret = process.env[`${providerId.toUpperCase()}_CLIENT_SECRET`]
  if (!clientId || !clientSecret) return fail(request, "provider_not_configured")

  const redirectUri = new URL(
    `/api/integrations/${providerId}/callback`,
    request.url
  ).toString()

  // Exchange code for token.
  const tokenRes = await fetch(provider.oauth.tokenUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })
  const tokenJson = (await tokenRes.json().catch(() => null)) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    error?: string
  } | null

  if (!tokenRes.ok || !tokenJson?.access_token) {
    return fail(request, tokenJson?.error ?? "token_exchange_failed")
  }

  // Profile the user so we can show a friendly account label.
  const profileRes = await fetch(provider.oauth.profileUrl, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-agents-app",
    },
  })
  const profile = (await profileRes.json().catch(() => null)) as {
    id?: number | string
    login?: string
    name?: string | null
  } | null

  if (!profileRes.ok || !profile?.id) {
    return fail(request, "profile_lookup_failed")
  }

  const accountId = String(profile.id)
  const tokenExpiresAt = tokenJson.expires_in
    ? new Date(Date.now() + tokenJson.expires_in * 1000)
    : null

  const connection = await prisma.integrationConnection.upsert({
    where: {
      organizationId_providerId_accountId: {
        organizationId,
        providerId,
        accountId,
      },
    },
    create: {
      organizationId,
      providerId,
      accessToken: encryptSecret(tokenJson.access_token),
      refreshToken: tokenJson.refresh_token ? encryptSecret(tokenJson.refresh_token) : null,
      tokenExpiresAt,
      scope: tokenJson.scope ?? null,
      accountId,
      accountLogin: profile.login ?? null,
      accountName: profile.name ?? null,
    },
    update: {
      accessToken: encryptSecret(tokenJson.access_token),
      refreshToken: tokenJson.refresh_token ? encryptSecret(tokenJson.refresh_token) : null,
      tokenExpiresAt,
      scope: tokenJson.scope ?? null,
      accountLogin: profile.login ?? null,
      accountName: profile.name ?? null,
    },
  })

  await logAudit({
    action: "integration.connected",
    targetType: "integration_connection",
    targetId: connection.id,
    targetLabel: profile.login
      ? `${providerId} (@${profile.login})`
      : providerId,
  })
  await notifyOrg(
    organizationId,
    {
      type: "integration.connected",
      title: `${provider.name} connected`,
      body: profile.login
        ? `Linked to @${profile.login}. Your agents can now use it.`
        : `Your agents can now use ${provider.name}.`,
      link: "/dashboard/integrations",
    },
    { exceptUserId: user.id }
  )

  const success = new URL("/dashboard/integrations", request.url)
  success.searchParams.set("connected", providerId)
  const response = NextResponse.redirect(success)
  response.cookies.delete(STATE_COOKIE)
  return response
}
