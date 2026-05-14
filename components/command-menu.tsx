"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboardIcon,
  ListIcon,
  ChartBarIcon,
  FolderIcon,
  UsersIcon,
  PlugZapIcon,
  Settings2Icon,
  CircleHelpIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

const searchItems = [
  {
    group: "Pages",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Lifecycle", url: "/dashboard/lifecycle", icon: ListIcon },
      { title: "Analytics", url: "/dashboard/analytics", icon: ChartBarIcon },
      { title: "Projects", url: "/dashboard/projects", icon: FolderIcon },
      { title: "Team", url: "/dashboard/team", icon: UsersIcon },
      { title: "Integrations", url: "/dashboard/integrations", icon: PlugZapIcon },
    ],
  },
  {
    group: "Documents",
    items: [
      { title: "Data Library", url: "/dashboard/data-library", icon: DatabaseIcon },
      { title: "Reports", url: "/dashboard/reports", icon: FileChartColumnIcon },
      { title: "Word Assistant", url: "/dashboard/word-assistant", icon: FileIcon },
    ],
  },
  {
    group: "Settings",
    items: [
      { title: "Settings", url: "/dashboard/settings", icon: Settings2Icon },
      { title: "Help", url: "/dashboard/help", icon: CircleHelpIcon },
    ],
  },
]

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    const handleOpen = () => setOpen(true)

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("command-menu:open", handleOpen)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("command-menu:open", handleOpen)
    }
  }, [])

  const navigate = React.useCallback(
    (url: string) => {
      setOpen(false)
      router.push(url)
    },
    [router]
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, documents, settings..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {searchItems.map((section, i) => (
          <React.Fragment key={section.group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={section.group}>
              {section.items.map((item) => (
                <CommandItem
                  key={item.url}
                  value={item.title}
                  onSelect={() => navigate(item.url)}
                >
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
