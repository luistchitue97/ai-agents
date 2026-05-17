import "server-only"

import type { IntegrationConnection } from "@prisma/client"

import { decryptSecret } from "@/lib/crypto"
import { prisma } from "@/lib/prisma"

const GITHUB_BASE = "https://api.github.com"
const DEFAULT_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ai-agents-app",
}

export class GitHubReconnectRequired extends Error {
  constructor(message = "This GitHub connection needs to be reconnected.") {
    super(message)
    this.name = "GitHubReconnectRequired"
  }
}

export type RepoSummary = {
  fullName: string
  description: string | null
  private: boolean
  defaultBranch: string
  openIssues: number
  stars: number
  updatedAt: string | null
  url: string
}

export type IssueSummary = {
  number: number
  title: string
  state: string
  author: string | null
  labels: string[]
  comments: number
  createdAt: string
  updatedAt: string
  url: string
}

export type IssueDetail = IssueSummary & {
  body: string | null
  comments_list: { author: string | null; createdAt: string; body: string }[]
}

export type PullRequestSummary = {
  number: number
  title: string
  state: string
  author: string | null
  draft: boolean
  createdAt: string
  updatedAt: string
  url: string
}

export type PullRequestDetail = PullRequestSummary & {
  body: string | null
  baseRef: string
  headRef: string
  merged: boolean
  mergedAt: string | null
  additions: number
  deletions: number
  changedFiles: number
}

async function getConnection(organizationId: string): Promise<IntegrationConnection> {
  const connection = await prisma.integrationConnection.findFirst({
    where: { organizationId, providerId: "github" },
  })
  if (!connection) {
    throw new GitHubReconnectRequired("GitHub is not connected for this organization.")
  }
  return connection
}

async function callGitHub<T>(
  connection: IntegrationConnection,
  path: string
): Promise<T> {
  const token = decryptSecret(connection.accessToken)
  const res = await fetch(`${GITHUB_BASE}${path}`, {
    headers: { ...DEFAULT_HEADERS, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    throw new GitHubReconnectRequired("GitHub rejected the token. Reconnect GitHub.")
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as T
}

// Cap how much body text we hand back to the model. Long issue/PR descriptions
// or comment threads would otherwise burn through the context budget.
const MAX_BODY_CHARS = 8000

function truncate(s: string | null | undefined): string | null {
  if (!s) return null
  return s.length > MAX_BODY_CHARS ? s.slice(0, MAX_BODY_CHARS) : s
}

export async function listRepos(
  organizationId: string,
  options: { perPage?: number } = {}
): Promise<RepoSummary[]> {
  const perPage = Math.min(100, Math.max(1, options.perPage ?? 30))
  const connection = await getConnection(organizationId)

  type Repo = {
    full_name: string
    description: string | null
    private: boolean
    default_branch: string
    open_issues_count: number
    stargazers_count: number
    updated_at: string | null
    html_url: string
  }
  const repos = await callGitHub<Repo[]>(
    connection,
    `/user/repos?per_page=${perPage}&sort=updated&affiliation=owner,collaborator,organization_member`
  )

  return repos.map((r) => ({
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    defaultBranch: r.default_branch,
    openIssues: r.open_issues_count,
    stars: r.stargazers_count,
    updatedAt: r.updated_at,
    url: r.html_url,
  }))
}

type RawIssue = {
  number: number
  title: string
  state: string
  user: { login: string } | null
  labels: ({ name: string } | string)[]
  comments: number
  created_at: string
  updated_at: string
  html_url: string
  body: string | null
  pull_request?: unknown // present means it's actually a PR
}

function toIssueSummary(i: RawIssue): IssueSummary {
  return {
    number: i.number,
    title: i.title,
    state: i.state,
    author: i.user?.login ?? null,
    labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)),
    comments: i.comments,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    url: i.html_url,
  }
}

export async function listIssues(
  organizationId: string,
  args: {
    owner: string
    repo: string
    state?: "open" | "closed" | "all"
    labels?: string
    perPage?: number
  }
): Promise<IssueSummary[]> {
  const perPage = Math.min(100, Math.max(1, args.perPage ?? 30))
  const state = args.state ?? "open"
  const labelsParam = args.labels ? `&labels=${encodeURIComponent(args.labels)}` : ""
  const connection = await getConnection(organizationId)

  const issues = await callGitHub<RawIssue[]>(
    connection,
    `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues?state=${state}&per_page=${perPage}${labelsParam}`
  )
  // GitHub's issues endpoint also returns PRs; the agent has a separate tool for those.
  return issues.filter((i) => !i.pull_request).map(toIssueSummary)
}

export async function getIssue(
  organizationId: string,
  args: { owner: string; repo: string; number: number }
): Promise<IssueDetail> {
  const connection = await getConnection(organizationId)

  const issue = await callGitHub<RawIssue>(
    connection,
    `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.number}`
  )

  type Comment = { user: { login: string } | null; created_at: string; body: string }
  const comments = await callGitHub<Comment[]>(
    connection,
    `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/issues/${args.number}/comments?per_page=30`
  )

  return {
    ...toIssueSummary(issue),
    body: truncate(issue.body),
    comments_list: comments.map((c) => ({
      author: c.user?.login ?? null,
      createdAt: c.created_at,
      body: truncate(c.body) ?? "",
    })),
  }
}

type RawPull = {
  number: number
  title: string
  state: string
  user: { login: string } | null
  draft: boolean
  created_at: string
  updated_at: string
  html_url: string
  body: string | null
  base: { ref: string }
  head: { ref: string }
  merged?: boolean
  merged_at?: string | null
  additions?: number
  deletions?: number
  changed_files?: number
}

function toPullSummary(p: RawPull): PullRequestSummary {
  return {
    number: p.number,
    title: p.title,
    state: p.state,
    author: p.user?.login ?? null,
    draft: p.draft,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    url: p.html_url,
  }
}

export async function listPullRequests(
  organizationId: string,
  args: {
    owner: string
    repo: string
    state?: "open" | "closed" | "all"
    perPage?: number
  }
): Promise<PullRequestSummary[]> {
  const perPage = Math.min(100, Math.max(1, args.perPage ?? 30))
  const state = args.state ?? "open"
  const connection = await getConnection(organizationId)

  const pulls = await callGitHub<RawPull[]>(
    connection,
    `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/pulls?state=${state}&per_page=${perPage}&sort=updated&direction=desc`
  )
  return pulls.map(toPullSummary)
}

export async function getPullRequest(
  organizationId: string,
  args: { owner: string; repo: string; number: number }
): Promise<PullRequestDetail> {
  const connection = await getConnection(organizationId)

  const pull = await callGitHub<RawPull>(
    connection,
    `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/pulls/${args.number}`
  )

  return {
    ...toPullSummary(pull),
    body: truncate(pull.body),
    baseRef: pull.base.ref,
    headRef: pull.head.ref,
    merged: pull.merged ?? false,
    mergedAt: pull.merged_at ?? null,
    additions: pull.additions ?? 0,
    deletions: pull.deletions ?? 0,
    changedFiles: pull.changed_files ?? 0,
  }
}
