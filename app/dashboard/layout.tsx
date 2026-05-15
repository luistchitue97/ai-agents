import { withAuth } from "@workos-inc/authkit-nextjs"

import { AppSidebar } from "@/components/app-sidebar"
import { CommandMenu } from "@/components/command-menu"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await withAuth({ ensureSignedIn: true })

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email.split("@")[0]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{
          name: displayName,
          email: user.email,
          avatar: user.profilePictureUrl ?? "",
        }}
      />
      <CommandMenu />
      <Toaster position="top-center" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
