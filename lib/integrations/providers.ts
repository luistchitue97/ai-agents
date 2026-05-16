export type IntegrationProvider = {
  id: string
  name: string
  iconPath: string
  category: string
  description: string
  /** OAuth 2.0 endpoints + scopes. Omit for providers we haven't wired yet. */
  oauth?: {
    authorizeUrl: string
    tokenUrl: string
    scopes: string[]
    /** Where the user is profiled after token exchange to pull a friendly account label. */
    profileUrl: string
  }
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
    },
    mcpUrl: "https://api.githubcopilot.com/mcp/",
  },
}

export function getProvider(id: string): IntegrationProvider {
  const p = integrationProviders[id]
  if (!p) throw new Error(`Unknown integration provider: ${id}`)
  return p
}
