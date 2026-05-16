import Image from "next/image"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { CheckCircle2Icon, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

import { DisconnectButton } from "./disconnect-button"

// Static catalog: visual rows for the page. The `id` matches a key in
// lib/integrations/providers.ts when OAuth has been wired (currently: github).
const catalog = [
  { id: null, name: "Google Workspace", description: "Sync calendars, contacts, Drive files, and Gmail into your workflow.", category: "Productivity", icon: "/icons/google.svg" },
  { id: null, name: "Jira", description: "Import issues, sprints, and project boards from Jira automatically.", category: "Project Management", icon: "/icons/jira.svg" },
  { id: null, name: "Slack", description: "Send notifications and receive updates directly in your Slack channels.", category: "Communication", icon: "/icons/slack.svg" },
  { id: "github", name: "GitHub", description: "Link pull requests, issues, and commits to your projects and tasks.", category: "Engineering", icon: "/icons/github.svg" },
  { id: null, name: "Notion", description: "Keep your Notion pages and databases in sync with your workspace.", category: "Productivity", icon: "/icons/notion.svg" },
  { id: null, name: "Salesforce", description: "Pull CRM records, deals, and contacts into your dashboard.", category: "CRM", icon: "/icons/salesforce.svg" },
  { id: null, name: "HubSpot", description: "Sync contacts, companies, and pipeline data from HubSpot.", category: "CRM", icon: "/icons/hubspot.svg" },
  { id: null, name: "Linear", description: "Surface Linear issues and cycles alongside your project timelines.", category: "Project Management", icon: "/icons/linear.svg" },
  { id: null, name: "Microsoft 365", description: "Connect Teams, Outlook, and OneDrive to unify your collaboration.", category: "Productivity", icon: "/icons/microsoft365.svg" },
  { id: null, name: "Zapier", description: "Automate workflows by connecting to thousands of apps via Zapier.", category: "Automation", icon: "/icons/zapier.svg" },
  { id: null, name: "Asana", description: "Bring Asana tasks and timelines into your unified project view.", category: "Project Management", icon: "/icons/asana.svg" },
  { id: null, name: "Stripe", description: "Monitor payments, subscriptions, and revenue metrics in real time.", category: "Finance", icon: "/icons/stripe.svg" },
] as const

type Connection = {
  id: string
  accountLogin: string | null
  accountName: string | null
}

export default async function IntegrationsPage() {
  const { organizationId } = await withAuth({ ensureSignedIn: true })
  const connections = organizationId
    ? await prisma.integrationConnection.findMany({
        where: { organizationId },
        select: { id: true, providerId: true, accountLogin: true, accountName: true },
      })
    : []

  const byProvider = new Map<string, Connection>()
  for (const c of connections) byProvider.set(c.providerId, c)

  const decorated = catalog.map((row) => ({
    ...row,
    connection: row.id ? (byProvider.get(row.id) ?? null) : null,
    wired: row.id !== null,
  }))

  const connected = decorated.filter((r) => r.connection)
  const available = decorated.filter((r) => !r.connection)

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect your favourite tools to streamline your workflow.
          </p>
        </div>

        {connected.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Connected ({connected.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {connected.map((row) => (
                <IntegrationCard key={row.name} row={row} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Available ({available.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {available.map((row) => (
              <IntegrationCard key={row.name} row={row} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function IntegrationCard({
  row,
}: {
  row: {
    id: string | null
    name: string
    description: string
    category: string
    icon: string
    connection: Connection | null
    wired: boolean
  }
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-white p-1.5 dark:bg-white/5">
          <Image
            src={row.icon}
            alt={row.name}
            width={28}
            height={28}
            className="object-contain"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{row.name}</CardTitle>
            {row.connection && (
              <CheckCircle2Icon className="size-3.5 shrink-0 text-green-500" />
            )}
          </div>
          <Badge variant="outline" className="w-fit text-[10px]">
            {row.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0">
        <CardDescription className="text-xs leading-relaxed">
          {row.connection?.accountLogin
            ? `Connected as @${row.connection.accountLogin}.`
            : row.description}
        </CardDescription>

        {row.connection ? (
          <DisconnectButton connectionId={row.connection.id} providerName={row.name} />
        ) : row.wired && row.id ? (
          <Button size="sm" variant="default" className="w-full" asChild>
            <a href={`/api/integrations/${row.id}/connect`}>
              <PlusIcon />
              Connect
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full" disabled>
            Coming soon
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
