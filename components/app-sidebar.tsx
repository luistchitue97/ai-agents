"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { OrgSwitcher, type OrgOption } from "@/components/org-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, ListIcon, ChartBarIcon, FolderIcon, BotIcon, CameraIcon, FileTextIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, PlugZapIcon, UsersIcon, ScrollTextIcon } from "lucide-react"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: (
        <LayoutDashboardIcon
        />
      ),
    },
    {
      title: "Lifecycle",
      url: "/dashboard/lifecycle",
      icon: (
        <ListIcon
        />
      ),
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: (
        <ChartBarIcon
        />
      ),
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: (
        <FolderIcon
        />
      ),
    },
    {
      title: "Agents",
      url: "/dashboard/agents",
      icon: (
        <BotIcon
        />
      ),
    },
    {
      title: "Integrations",
      url: "/dashboard/integrations",
      icon: (
        <PlugZapIcon
        />
      ),
    },
    {
      title: "Team",
      url: "/dashboard/team",
      icon: (
        <UsersIcon
        />
      ),
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: (
        <CameraIcon
        />
      ),
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: (
        <FileTextIcon
        />
      ),
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: (
        <FileTextIcon
        />
      ),
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: (
        <Settings2Icon
        />
      ),
    },
    {
      title: "Get Help",
      url: "/dashboard/help",
      icon: (
        <CircleHelpIcon
        />
      ),
    },
    {
      title: "Search",
      url: "/dashboard/search",
      icon: (
        <SearchIcon
        />
      ),
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "/dashboard/data-library",
      icon: (
        <DatabaseIcon
        />
      ),
    },
    {
      name: "Reports",
      url: "/dashboard/reports",
      icon: (
        <FileChartColumnIcon
        />
      ),
    },
    {
      name: "Word Assistant",
      url: "/dashboard/word-assistant",
      icon: (
        <FileIcon
        />
      ),
    },
  ],
}

type SidebarUser = { name: string; email: string; avatar: string }

export function AppSidebar({
  user,
  organizations,
  currentOrgId,
  isAdmin,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: SidebarUser
  organizations?: OrgOption[]
  currentOrgId?: string
  isAdmin?: boolean
}) {
  const navMain = isAdmin
    ? [
        ...data.navMain,
        {
          title: "Audit Log",
          url: "/dashboard/logs",
          icon: <ScrollTextIcon />,
        },
      ]
    : data.navMain
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        {organizations && currentOrgId && (
          <OrgSwitcher organizations={organizations} currentOrgId={currentOrgId} />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user ?? data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
