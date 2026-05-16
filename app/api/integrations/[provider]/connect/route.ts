import { randomBytes } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { withAuth } from "@workos-inc/authkit-nextjs"

import { envPrefixFor, getProvider } from "@/lib/integrations/providers"

const STATE_COOKIE = "integration_oauth_state"
const STATE_MAX_AGE = 600 // 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params
  const provider = getProvider(providerId)
  if (!provider.oauth) {
    return NextResponse.json({ error: "Provider does not support OAuth." }, { status: 400 })
  }

  const { organizationId } = await withAuth({ ensureSignedIn: true })
  if (!organizationId) {
    return NextResponse.redirect(new URL("/onboarding/organization", request.url))
  }

  const envPrefix = envPrefixFor(provider)
  const clientId = process.env[`${envPrefix}_CLIENT_ID`]
  if (!clientId) {
    return NextResponse.json(
      { error: `${envPrefix}_CLIENT_ID is not configured.` },
      { status: 500 }
    )
  }

  const state = randomBytes(32).toString("base64url")
  const redirectUri = new URL(`/api/integrations/${providerId}/callback`, request.url).toString()

  const authorizeUrl = new URL(provider.oauth.authorizeUrl)
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", provider.oauth.scopes.join(" "))
  authorizeUrl.searchParams.set("state", state)
  for (const [k, v] of Object.entries(provider.oauth.extraAuthorizeParams ?? {})) {
    authorizeUrl.searchParams.set(k, v)
  }

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE,
  })
  return response
}
