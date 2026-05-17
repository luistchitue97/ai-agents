import "server-only"

import {
  getIssue,
  getPullRequest,
  listIssues,
  listPullRequests,
  listRepos,
} from "@/lib/integrations/github"

import type { ProviderToolModule, ToolDefinition } from "./types"

function requireString(value: unknown, field: string): string {
  const v = typeof value === "string" ? value.trim() : ""
  if (!v) throw new Error(`${field} is required.`)
  return v
}

function requireInt(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${field} must be a positive integer.`)
  }
  return n
}

const githubListRepos: ToolDefinition = {
  name: "github_list_repos",
  description:
    "List GitHub repositories the connected user can access (own, collaborator, and organization). " +
    "Returns full_name (owner/repo), description, default branch, open issue count, stars, and last update time, " +
    "ordered by most recently updated. Use this first to discover which repos exist before asking about issues or PRs.",
  inputSchema: {
    type: "object",
    properties: {
      perPage: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Number of repositories to return (1-100). Default 30.",
      },
    },
  },
  handler: async (input, ctx) => {
    const perPage =
      typeof input.perPage === "number" ? input.perPage : undefined
    return await listRepos(ctx.organizationId, { perPage })
  },
}

const githubListIssues: ToolDefinition = {
  name: "github_list_issues",
  description:
    "List issues in a specific repository. Returns number, title, state, author, labels, comment count, " +
    "and timestamps. Pull requests are filtered out — use github_list_pull_requests for those. " +
    "Filter by state (open/closed/all) and labels (comma-separated label names).",
  inputSchema: {
    type: "object",
    properties: {
      owner: { type: "string", description: "Repository owner (user or organization)." },
      repo: { type: "string", description: "Repository name." },
      state: {
        type: "string",
        enum: ["open", "closed", "all"],
        description: "Issue state. Defaults to 'open'.",
      },
      labels: {
        type: "string",
        description: "Comma-separated label names to filter by (e.g. 'bug,p0').",
      },
      perPage: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Number of issues to return (1-100). Default 30.",
      },
    },
    required: ["owner", "repo"],
  },
  handler: async (input, ctx) => {
    const owner = requireString(input.owner, "owner")
    const repo = requireString(input.repo, "repo")
    const state = (input.state as "open" | "closed" | "all" | undefined) ?? undefined
    const labels = typeof input.labels === "string" ? input.labels : undefined
    const perPage =
      typeof input.perPage === "number" ? input.perPage : undefined
    return await listIssues(ctx.organizationId, { owner, repo, state, labels, perPage })
  },
}

const githubGetIssue: ToolDefinition = {
  name: "github_get_issue",
  description:
    "Fetch the full body of an issue plus the first page of its comments. " +
    "Use after github_list_issues to read an issue that looks important. " +
    "Body and comment bodies are truncated at ~8000 characters each.",
  inputSchema: {
    type: "object",
    properties: {
      owner: { type: "string", description: "Repository owner." },
      repo: { type: "string", description: "Repository name." },
      number: { type: "integer", description: "Issue number." },
    },
    required: ["owner", "repo", "number"],
  },
  handler: async (input, ctx) => {
    const owner = requireString(input.owner, "owner")
    const repo = requireString(input.repo, "repo")
    const number = requireInt(input.number, "number")
    return await getIssue(ctx.organizationId, { owner, repo, number })
  },
}

const githubListPullRequests: ToolDefinition = {
  name: "github_list_pull_requests",
  description:
    "List pull requests in a specific repository, ordered by most recently updated. " +
    "Returns number, title, state, author, draft flag, and timestamps. " +
    "Filter by state (open/closed/all). Use github_get_pull_request to fetch full details for a specific PR.",
  inputSchema: {
    type: "object",
    properties: {
      owner: { type: "string", description: "Repository owner." },
      repo: { type: "string", description: "Repository name." },
      state: {
        type: "string",
        enum: ["open", "closed", "all"],
        description: "PR state. Defaults to 'open'.",
      },
      perPage: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Number of PRs to return (1-100). Default 30.",
      },
    },
    required: ["owner", "repo"],
  },
  handler: async (input, ctx) => {
    const owner = requireString(input.owner, "owner")
    const repo = requireString(input.repo, "repo")
    const state = (input.state as "open" | "closed" | "all" | undefined) ?? undefined
    const perPage =
      typeof input.perPage === "number" ? input.perPage : undefined
    return await listPullRequests(ctx.organizationId, { owner, repo, state, perPage })
  },
}

const githubGetPullRequest: ToolDefinition = {
  name: "github_get_pull_request",
  description:
    "Fetch the full body of a pull request plus diff stats (additions, deletions, changed files) " +
    "and merge state. Use after github_list_pull_requests for any PR that looks important. " +
    "Body is truncated at ~8000 characters.",
  inputSchema: {
    type: "object",
    properties: {
      owner: { type: "string", description: "Repository owner." },
      repo: { type: "string", description: "Repository name." },
      number: { type: "integer", description: "Pull request number." },
    },
    required: ["owner", "repo", "number"],
  },
  handler: async (input, ctx) => {
    const owner = requireString(input.owner, "owner")
    const repo = requireString(input.repo, "repo")
    const number = requireInt(input.number, "number")
    return await getPullRequest(ctx.organizationId, { owner, repo, number })
  },
}

export const githubToolModule: ProviderToolModule = {
  providerId: "github",
  buildTools: () => [
    githubListRepos,
    githubListIssues,
    githubGetIssue,
    githubListPullRequests,
    githubGetPullRequest,
  ],
}
