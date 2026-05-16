"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BuildingIcon, CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react"

import { switchOrgAction } from "@/app/dashboard/org-actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type OrgOption = {
  id: string
  name: string
}

export function OrgSwitcher({
  organizations,
  currentOrgId,
}: {
  organizations: OrgOption[]
  currentOrgId: string
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const current =
    organizations.find((o) => o.id === currentOrgId) ?? {
      id: currentOrgId,
      name: "Organization",
    }

  function onSelect(orgId: string) {
    if (orgId === currentOrgId) return
    startTransition(async () => {
      try {
        await switchOrgAction(orgId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to switch organization."
        // Next.js redirect() throws a special error — let it propagate.
        if (msg.toLowerCase().includes("next_redirect")) throw err
        toast.error(msg)
      }
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={isPending}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <BuildingIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{current.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {organizations.length > 1
                    ? `${organizations.length} organizations`
                    : "Organization"}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onSelect={() => onSelect(org.id)}
                className="gap-2"
              >
                <BuildingIcon className="size-4 text-muted-foreground" />
                <span className="truncate flex-1">{org.name}</span>
                {org.id === currentOrgId && <CheckIcon className="size-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => router.push("/onboarding/organization")}
            >
              <PlusIcon className="size-4" />
              Create organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
