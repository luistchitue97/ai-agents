"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  MailIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UserMinusIcon,
  UsersIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  changeMemberRole,
  generatePortalLink,
  removeMember,
  resendInvite,
  revokeInvite,
  sendInvite,
} from "./actions"

export type Member = {
  membershipId: string
  userId: string
  email: string
  name: string
  avatarUrl: string | null
  roleSlug: "admin" | "member"
  status: "active" | "inactive" | "pending"
  isYou: boolean
}

export type Invite = {
  id: string
  email: string
  roleSlug: "admin" | "member"
  expiresAt: string
  createdAt: string
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  roleSlug: z.enum(["admin", "member"]),
})
type InviteValues = z.infer<typeof inviteSchema>

const PAGE_SIZE = 10

export function TeamPageClient({
  isAdmin,
  members,
  pendingInvites,
}: {
  isAdmin: boolean
  members: Member[]
  pendingInvites: Invite[]
}) {
  const [memberFilter, setMemberFilter] = React.useState<string>("all")

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 px-4 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-sm text-muted-foreground">
              Manage members, roles, and invitations.
            </p>
          </div>
          {isAdmin && <InviteDialog />}
        </div>

        {!isAdmin && (
          <p className="text-xs text-muted-foreground">
            You have read-only access. Ask an admin to invite or remove members.
          </p>
        )}

        {isAdmin && <EnterpriseSection />}

        <MembersTable
          members={members}
          isAdmin={isAdmin}
          memberFilter={memberFilter}
          onMemberFilterChange={setMemberFilter}
        />

        <PendingInvitesTable invites={pendingInvites} isAdmin={isAdmin} />
      </div>
    </div>
  )
}

type PortalIntent = "sso" | "dsync" | "audit_logs" | "domain_verification"

function EnterpriseSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enterprise SSO &amp; Directory Sync</CardTitle>
        <CardDescription>
          Open the WorkOS Admin Portal to configure SAML/OIDC sign-in or SCIM
          provisioning for your organization. Links are short-lived and
          single-use.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <PortalLinkButton
          intent="sso"
          label="Configure SSO"
          description="SAML or OIDC sign-in"
          icon={<KeyRoundIcon />}
        />
        <PortalLinkButton
          intent="dsync"
          label="Configure Directory Sync"
          description="SCIM user provisioning"
          icon={<UsersRoundIcon />}
        />
      </CardContent>
    </Card>
  )
}

function PortalLinkButton({
  intent,
  label,
  description,
  icon,
}: {
  intent: PortalIntent
  label: string
  description: string
  icon: React.ReactNode
}) {
  const [isPending, startTransition] = React.useTransition()

  function onClick() {
    startTransition(async () => {
      try {
        const { link } = await generatePortalLink({ intent })
        // Open in a new tab so the admin can return here if they cancel.
        window.open(link, "_blank", "noopener,noreferrer")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to open portal.")
      }
    })
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={isPending}
      className="h-auto justify-start gap-3 py-3"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex flex-1 flex-col items-start gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground font-normal">
          {description}
        </span>
      </span>
      {isPending ? (
        <span className="text-xs text-muted-foreground">Opening...</span>
      ) : (
        <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
      )}
    </Button>
  )
}

function InviteDialog() {
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", roleSlug: "member" },
  })

  function onSubmit(values: InviteValues) {
    startTransition(async () => {
      try {
        await sendInvite(values)
        toast.success(`Invitation sent to ${values.email}`)
        form.reset()
        setOpen(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send invitation."
        form.setError("root", { message: msg })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MailIcon />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with a link to join your organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="off"
                      placeholder="teammate@example.com"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending..." : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function MembersTable({
  members,
  isAdmin,
  memberFilter,
  onMemberFilterChange,
}: {
  members: Member[]
  isAdmin: boolean
  memberFilter: string
  onMemberFilterChange: (next: string) => void
}) {
  const [pageIndex, setPageIndex] = React.useState(0)

  React.useEffect(() => {
    setPageIndex(0)
  }, [memberFilter, members.length])

  const filtered =
    memberFilter === "all"
      ? members
      : members.filter((m) => m.userId === memberFilter)

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  if (safePageIndex !== pageIndex) {
    queueMicrotask(() => setPageIndex(safePageIndex))
  }
  const pageStart = safePageIndex * PAGE_SIZE
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const canPrev = safePageIndex > 0
  const canNext = safePageIndex < pageCount - 1

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
          <CardDescription>Everyone in your organization.</CardDescription>
        </div>
        <MemberSearch
          members={members}
          value={memberFilter}
          onChange={onMemberFilterChange}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 4 : 3}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No members match your search.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((m) => (
                <MemberRow key={m.membershipId} member={m} isAdmin={isAdmin} />
              ))
            )}
          </TableBody>
        </Table>
        <PaginationFooter
          pageStart={pageStart}
          pagedCount={paged.length}
          filteredCount={filtered.length}
          totalCount={members.length}
          pageIndex={safePageIndex}
          pageCount={pageCount}
          canPrev={canPrev}
          canNext={canNext}
          onPageChange={setPageIndex}
        />
      </CardContent>
    </Card>
  )
}

function MemberSearch({
  members,
  value,
  onChange,
}: {
  members: Member[]
  value: string
  onChange: (next: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const selected = value === "all" ? null : members.find((m) => m.userId === value)

  function pick(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 justify-start gap-2 text-xs font-normal sm:w-56"
      >
        <SearchIcon className="size-3.5" />
        {selected ? (
          <span className="truncate">{selected.name}</span>
        ) : (
          <span className="text-muted-foreground">Search members...</span>
        )}
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search members by name or email..." />
        <CommandList>
          <CommandEmpty>No members match your search.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              value="all members"
              onSelect={() => pick("all")}
              className="flex items-center gap-3"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <UsersIcon className="size-3.5 text-muted-foreground" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">All members</span>
                <span className="text-xs text-muted-foreground">
                  Show everyone in the organization
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{members.length}</span>
              {value === "all" && <CheckIcon className="ml-1 size-4" />}
            </CommandItem>
          </CommandGroup>
          {members.length > 0 && (
            <CommandGroup heading="Members">
              {members.map((m) => (
                <CommandItem
                  key={m.userId}
                  value={`${m.name} ${m.email}`}
                  onSelect={() => pick(m.userId)}
                  className="flex items-center gap-3"
                >
                  <Avatar className="size-7">
                    {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
                    <AvatarFallback className="text-[10px]">
                      {initialsFrom(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{m.name}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {m.email}
                    </span>
                  </div>
                  <Badge variant={m.roleSlug === "admin" ? "default" : "secondary"} className="text-[10px]">
                    {m.roleSlug === "admin" ? "Admin" : "Member"}
                  </Badge>
                  {value === m.userId && <CheckIcon className="ml-1 size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

function PaginationFooter({
  pageStart,
  pagedCount,
  filteredCount,
  totalCount,
  pageIndex,
  pageCount,
  canPrev,
  canNext,
  onPageChange,
}: {
  pageStart: number
  pagedCount: number
  filteredCount: number
  totalCount: number
  pageIndex: number
  pageCount: number
  canPrev: boolean
  canNext: boolean
  onPageChange: (next: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
      <p className="text-xs text-muted-foreground">
        {filteredCount === 0
          ? "No entries"
          : `Showing ${pageStart + 1}–${pageStart + pagedCount} of ${filteredCount}${
              filteredCount !== totalCount ? ` (filtered from ${totalCount})` : ""
            }`}
      </p>
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => onPageChange(0)}
            disabled={!canPrev}
            aria-label="Go to first page"
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
            disabled={!canPrev}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}
            disabled={!canNext}
            aria-label="Go to next page"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={!canNext}
            aria-label="Go to last page"
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

function MemberRow({ member, isAdmin }: { member: Member; isAdmin: boolean }) {
  const [isPending, startTransition] = React.useTransition()

  function onChangeRole(roleSlug: "admin" | "member") {
    if (roleSlug === member.roleSlug) return
    startTransition(async () => {
      try {
        await changeMemberRole({ membershipId: member.membershipId, roleSlug })
        toast.success(`${member.name} is now ${roleSlug === "admin" ? "an admin" : "a member"}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update role.")
      }
    })
  }

  function onRemove() {
    startTransition(async () => {
      try {
        await removeMember(member.membershipId)
        toast.success(`${member.name} removed`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove member.")
      }
    })
  }

  const canEdit = isAdmin && !member.isYou

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
            <AvatarFallback className="text-xs">{initialsFrom(member.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">
              {member.name}
              {member.isYou && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground truncate">{member.email}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Select
            value={member.roleSlug}
            onValueChange={(v) => onChangeRole(v as "admin" | "member")}
            disabled={isPending}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">
                <span className="flex items-center gap-2">
                  <ShieldIcon className="size-3.5" />
                  Member
                </span>
              </SelectItem>
              <SelectItem value="admin">
                <span className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-3.5" />
                  Admin
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={member.roleSlug === "admin" ? "default" : "secondary"}>
            {member.roleSlug === "admin" ? (
              <ShieldCheckIcon className="size-3" />
            ) : (
              <ShieldIcon className="size-3" />
            )}
            {member.roleSlug === "admin" ? "Admin" : "Member"}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={member.status} />
      </TableCell>
      {isAdmin && (
        <TableCell>
          {!member.isYou && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={onRemove}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinusIcon />
                  Remove from organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}

function StatusBadge({ status }: { status: "active" | "inactive" | "pending" }) {
  if (status === "active")
    return (
      <Badge variant="outline" className="text-green-700 dark:text-green-400">
        Active
      </Badge>
    )
  if (status === "pending")
    return <Badge variant="outline">Pending</Badge>
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Inactive
    </Badge>
  )
}

function PendingInvitesTable({
  invites,
  isAdmin,
}: {
  invites: Invite[]
  isAdmin: boolean
}) {
  const [pageIndex, setPageIndex] = React.useState(0)

  React.useEffect(() => {
    setPageIndex(0)
  }, [invites.length])

  if (invites.length === 0) return null

  const pageCount = Math.max(1, Math.ceil(invites.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  if (safePageIndex !== pageIndex) {
    queueMicrotask(() => setPageIndex(safePageIndex))
  }
  const pageStart = safePageIndex * PAGE_SIZE
  const paged = invites.slice(pageStart, pageStart + PAGE_SIZE)
  const canPrev = safePageIndex > 0
  const canNext = safePageIndex < pageCount - 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending invitations ({invites.length})</CardTitle>
        <CardDescription>
          Invites that haven&apos;t been accepted yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Expires</TableHead>
              {isAdmin && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((inv) => (
              <InviteRow key={inv.id} invite={inv} isAdmin={isAdmin} />
            ))}
          </TableBody>
        </Table>
        <PaginationFooter
          pageStart={pageStart}
          pagedCount={paged.length}
          filteredCount={invites.length}
          totalCount={invites.length}
          pageIndex={safePageIndex}
          pageCount={pageCount}
          canPrev={canPrev}
          canNext={canNext}
          onPageChange={setPageIndex}
        />
      </CardContent>
    </Card>
  )
}

function InviteRow({ invite, isAdmin }: { invite: Invite; isAdmin: boolean }) {
  const [isPending, startTransition] = React.useTransition()

  function onResend() {
    startTransition(async () => {
      try {
        await resendInvite(invite.id)
        toast.success(`Invitation resent to ${invite.email}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to resend invite.")
      }
    })
  }

  function onRevoke() {
    startTransition(async () => {
      try {
        await revokeInvite(invite.id)
        toast.success(`Invitation to ${invite.email} revoked`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to revoke invite.")
      }
    })
  }

  const expires = new Date(invite.expiresAt)
  const expiresLabel = expires.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{invite.email}</TableCell>
      <TableCell>
        <Badge variant={invite.roleSlug === "admin" ? "default" : "secondary"}>
          {invite.roleSlug === "admin" ? "Admin" : "Member"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{expiresLabel}</TableCell>
      {isAdmin && (
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onResend}>
                <RefreshCwIcon />
                Resend
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onRevoke}
                className="text-destructive focus:text-destructive"
              >
                <XIcon />
                Revoke
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  )
}
