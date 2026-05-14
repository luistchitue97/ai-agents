import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2Icon, PlusIcon } from "lucide-react"

const integrations = [
  {
    name: "Google Workspace",
    description: "Sync calendars, contacts, Drive files, and Gmail into your workflow.",
    category: "Productivity",
    icon: "/icons/google.svg",
    connected: true,
  },
  {
    name: "Jira",
    description: "Import issues, sprints, and project boards from Jira automatically.",
    category: "Project Management",
    icon: "/icons/jira.svg",
    connected: true,
  },
  {
    name: "Slack",
    description: "Send notifications and receive updates directly in your Slack channels.",
    category: "Communication",
    icon: "/icons/slack.svg",
    connected: false,
  },
  {
    name: "GitHub",
    description: "Link pull requests, issues, and commits to your projects and tasks.",
    category: "Engineering",
    icon: "/icons/github.svg",
    connected: false,
  },
  {
    name: "Notion",
    description: "Keep your Notion pages and databases in sync with your workspace.",
    category: "Productivity",
    icon: "/icons/notion.svg",
    connected: false,
  },
  {
    name: "Salesforce",
    description: "Pull CRM records, deals, and contacts into your dashboard.",
    category: "CRM",
    icon: "/icons/salesforce.svg",
    connected: false,
  },
  {
    name: "HubSpot",
    description: "Sync contacts, companies, and pipeline data from HubSpot.",
    category: "CRM",
    icon: "/icons/hubspot.svg",
    connected: false,
  },
  {
    name: "Linear",
    description: "Surface Linear issues and cycles alongside your project timelines.",
    category: "Project Management",
    icon: "/icons/linear.svg",
    connected: false,
  },
  {
    name: "Microsoft 365",
    description: "Connect Teams, Outlook, and OneDrive to unify your collaboration.",
    category: "Productivity",
    icon: "/icons/microsoft365.svg",
    connected: false,
  },
  {
    name: "Zapier",
    description: "Automate workflows by connecting to thousands of apps via Zapier.",
    category: "Automation",
    icon: "/icons/zapier.svg",
    connected: false,
  },
  {
    name: "Asana",
    description: "Bring Asana tasks and timelines into your unified project view.",
    category: "Project Management",
    icon: "/icons/asana.svg",
    connected: false,
  },
  {
    name: "Stripe",
    description: "Monitor payments, subscriptions, and revenue metrics in real time.",
    category: "Finance",
    icon: "/icons/stripe.svg",
    connected: false,
  },
]

export default function IntegrationsPage() {
  const connected = integrations.filter((i) => i.connected)
  const available = integrations.filter((i) => !i.connected)

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
              {connected.map((integration) => (
                <IntegrationCard key={integration.name} integration={integration} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Available ({available.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {available.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function IntegrationCard({
  integration,
}: {
  integration: (typeof integrations)[number]
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-white p-1.5 dark:bg-white/5">
          <Image
            src={integration.icon}
            alt={integration.name}
            width={28}
            height={28}
            className="object-contain"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{integration.name}</CardTitle>
            {integration.connected && (
              <CheckCircle2Icon className="size-3.5 shrink-0 text-green-500" />
            )}
          </div>
          <Badge variant="outline" className="w-fit text-[10px]">
            {integration.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0">
        <CardDescription className="text-xs leading-relaxed">
          {integration.description}
        </CardDescription>
        <Button
          size="sm"
          variant={integration.connected ? "outline" : "default"}
          className="w-full"
        >
          {integration.connected ? (
            "Disconnect"
          ) : (
            <>
              <PlusIcon />
              Connect
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
