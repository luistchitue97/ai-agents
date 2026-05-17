export type ParsedProfile = {
  id: string
  login?: string
  name?: string
  email?: string
}

export type IntegrationProvider = {
  id: string
  name: string
  iconPath: string
  category: string
  description: string
  /** Override the env var prefix (default uses providerId.toUpperCase()). Useful when several providers share one OAuth client. */
  envPrefix?: string
  oauth?: {
    authorizeUrl: string
    tokenUrl: string
    scopes: string[]
    /** Where the user is profiled after token exchange to pull a friendly account label. */
    profileUrl: string
    /** "form" for Google (application/x-www-form-urlencoded), "json" for GitHub. Default "json". */
    tokenRequestEncoding?: "json" | "form"
    /** Extra params to append to the authorize URL (e.g. access_type=offline&prompt=consent for Google, allow_signup=false for GitHub). */
    extraAuthorizeParams?: Record<string, string>
    /** Headers to send when fetching the profile (e.g. GitHub's Accept). */
    profileHeaders?: Record<string, string>
    /** Extract canonical account fields from this provider's profile response. */
    parseProfile: (profile: unknown) => ParsedProfile
  }
  /** Optional in-app inbox/view route when the connection is established. */
  viewHref?: string
  /** Remote MCP server URL the agent runtime will call. */
  mcpUrl?: string
}

export const integrationProviders: Record<string, IntegrationProvider> = {
  github: {
    id: "github",
    name: "GitHub",
    iconPath: "/icons/github.svg",
    category: "Code",
    description: "Connect repos, issues, and PRs.",
    oauth: {
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scopes: ["read:user", "repo"],
      profileUrl: "https://api.github.com/user",
      tokenRequestEncoding: "json",
      extraAuthorizeParams: { allow_signup: "false" },
      profileHeaders: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ai-agents-app",
      },
      parseProfile: (raw) => {
        const p = raw as {
          id?: number | string
          login?: string
          name?: string | null
          email?: string | null
        }
        return {
          id: String(p.id ?? ""),
          login: p.login ?? undefined,
          name: p.name ?? undefined,
          email: p.email ?? undefined,
        }
      },
    },
    mcpUrl: "https://api.githubcopilot.com/mcp/",
  },
  gmail: {
    id: "gmail",
    name: "Gmail",
    iconPath: "/icons/google.svg",
    category: "Productivity",
    description:
      "Read your inbox. Your agents can search messages and surface what matters.",
    envPrefix: "GOOGLE",
    viewHref: "/dashboard/integrations/gmail",
    oauth: {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
      ],
      profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      tokenRequestEncoding: "form",
      extraAuthorizeParams: {
        access_type: "offline",
        // `consent` forces Google to return a refresh_token every time — otherwise it
        // only comes back on the very first authorization, which is easy to lose.
        prompt: "consent",
        include_granted_scopes: "true",
      },
      parseProfile: (raw) => {
        const p = raw as { sub?: string; email?: string; name?: string }
        return {
          id: p.sub ?? "",
          login: p.email,
          name: p.name,
          email: p.email,
        }
      },
    },
  },
}

export function getProvider(id: string): IntegrationProvider {
  const p = integrationProviders[id]
  if (!p) throw new Error(`Unknown integration provider: ${id}`)
  return p
}

export function envPrefixFor(provider: IntegrationProvider): string {
  return provider.envPrefix ?? provider.id.toUpperCase()
}
