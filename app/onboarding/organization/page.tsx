import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import { BotIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { CreateOrganizationForm } from "./create-organization-form"

export default async function CreateOrganizationPage() {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true })

  // Already in an org — bypass onboarding.
  if (organizationId) redirect("/dashboard")

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <BotIcon className="size-5 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle>Create your organization</CardTitle>
            <CardDescription>
              You'll be the admin. Invite teammates and configure SSO from
              settings once you're in.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm userEmail={user.email} />
        </CardContent>
      </Card>
    </div>
  )
}
