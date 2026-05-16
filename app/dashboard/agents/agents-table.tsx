"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ActivityIcon,
  BotIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  EllipsisVerticalIcon,
  TriangleAlertIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  XIcon,
  Trash2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
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

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { createAgent, deleteAgents } from "./actions"
import { type Agent, type AgentStatus } from "./data"

const newAgentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be 50 characters or fewer"),
  description: z.string().min(10, "Description must be at least 10 characters").max(200, "Description must be 200 characters or fewer"),
  capabilities: z
    .array(z.string().min(1).max(40, "Each capability must be 40 characters or fewer"))
    .max(3, "Up to 3 capabilities"),
})

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  idle: { label: "Idle", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  paused: { label: "Paused", className: "bg-muted text-muted-foreground" },
}

const columns: ColumnDef<Agent>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <BotIcon className="size-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.name}</span>
          <span className="hidden text-xs text-muted-foreground lg:block">
            {row.original.description}
          </span>
        </div>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = statusConfig[row.original.status]
      return (
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: "model",
    header: "Model",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.model}</span>
    ),
  },
  {
    accessorKey: "capabilities",
    header: "Capabilities",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.capabilities.map((cap) => (
          <Badge key={cap} variant="secondary" className="text-[10px]">
            {cap}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "tasksCompleted",
    header: () => (
      <div className="flex items-center justify-end gap-1">
        <ActivityIcon className="size-3.5" />
        Tasks
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums text-sm text-muted-foreground">
        {row.original.tasksCompleted.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "lastActive",
    header: "Last active",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.lastActive}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="size-8">
          {row.original.status === "paused" ? (
            <>
              <PlayIcon className="size-4" />
              <span className="sr-only">Resume {row.original.name}</span>
            </>
          ) : (
            <>
              <PauseIcon className="size-4" />
              <span className="sr-only">Pause {row.original.name}</span>
            </>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground data-[state=open]:bg-muted"
            >
              <EllipsisVerticalIcon className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/agents/${row.original.id}`}>Configure</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/agents/${row.original.id}/logs`}>View logs</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

export function AgentsTable({ initialData }: { initialData: Agent[] }) {
  const [data, setData] = React.useState(initialData)
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState("")
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [newAgentDialogOpen, setNewAgentDialogOpen] = React.useState(false)
  const [capInput, setCapInput] = React.useState("")

  function deleteConfirmPhrase(count: number): string {
    return count === 1
      ? "I am willing to delete this agent"
      : "I am willing to delete these agents"
  }

  const newAgentForm = useForm<z.infer<typeof newAgentSchema>>({
    resolver: zodResolver(newAgentSchema),
    defaultValues: { name: "", description: "", capabilities: [] },
  })

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isCreating, startCreateTransition] = React.useTransition()
  const [isDeleting, startDeleteTransition] = React.useTransition()

  // Open the New Agent dialog when navigated to with ?new=1 (e.g. from the sidebar).
  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setNewAgentDialogOpen(true)
    }
  }, [searchParams])

  function closeNewAgentDialog() {
    setNewAgentDialogOpen(false)
    newAgentForm.reset()
    setCapInput("")
    if (searchParams.get("new")) {
      router.replace(pathname)
    }
  }

  function onDeleteConfirm() {
    setDeleteError(null)
    const selected = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id)
    if (selected.length === 0) {
      setDeleteError("No agents selected.")
      return
    }
    const selectedSet = new Set(selected)
    const backup = data
    setData((prev) => prev.filter((a) => !selectedSet.has(a.id)))
    setDeleteDialogOpen(false)
    setConfirmText("")
    setRowSelection({})
    startDeleteTransition(async () => {
      try {
        const { deleted } = await deleteAgents(selected)
        toast.success(`${deleted} agent${deleted === 1 ? "" : "s"} deleted`)
      } catch (err) {
        setData(backup)
        toast.error(err instanceof Error ? err.message : "Failed to delete agents.")
      }
    })
  }

  function onNewAgentSubmit(values: z.infer<typeof newAgentSchema>) {
    startCreateTransition(async () => {
      try {
        const agent = await createAgent(values)
        closeNewAgentDialog()
        toast.success(`${agent.name} created`, {
          description: "Configure your new agent below.",
        })
        router.push(`/dashboard/agents/${agent.id}`)
      } catch (err) {
        newAgentForm.setError("root", {
          message: err instanceof Error ? err.message : "Failed to create agent.",
        })
      }
    })
  }

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-4 md:gap-6 md:py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-base font-medium">Agents</h1>
            <p className="text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.filter((r) => r.original.status === "active").length} of{" "}
              {table.getFilteredRowModel().rows.length} running
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={table.getFilteredSelectedRowModel().rows.length === 0}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon />
              <span className="hidden lg:inline">
                Delete{" "}
                {table.getFilteredSelectedRowModel().rows.length > 0
                  ? `(${table.getFilteredSelectedRowModel().rows.length})`
                  : "Selected"}
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3Icon data-icon="inline-start" />
                  Columns
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {table
                  .getAllColumns()
                  .filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide())
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      className="capitalize"
                      checked={col.getIsVisible()}
                      onCheckedChange={(value) => col.toggleVisibility(!!value)}
                    >
                      {col.id === "tasksCompleted" ? "Tasks" : col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setNewAgentDialogOpen(true)}>
              <PlusIcon />
              <span className="hidden lg:inline">New Agent</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No agents found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4">
            <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRightIcon />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Agent dialog */}
      <Dialog
        open={newAgentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeNewAgentDialog()
          } else {
            setNewAgentDialogOpen(true)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New agent</DialogTitle>
            <DialogDescription>
              Give your agent a name and a short description of what it does.
            </DialogDescription>
          </DialogHeader>

          <Form {...newAgentForm}>
            <form
              id="new-agent-form"
              onSubmit={newAgentForm.handleSubmit(onNewAgentSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={newAgentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Research Agent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newAgentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this agent does..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newAgentForm.control}
                name="capabilities"
                render={({ field }) => {
                  const tags = field.value ?? []
                  const addTag = (raw: string) => {
                    const t = raw.trim()
                    if (!t || tags.includes(t) || tags.length >= 3) return
                    field.onChange([...tags, t])
                  }
                  const removeTag = (idx: number) => {
                    field.onChange(tags.filter((_, i) => i !== idx))
                  }
                  return (
                    <FormItem>
                      <FormLabel>Capabilities</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                          {tags.map((tag, idx) => (
                            <Badge
                              key={`${tag}-${idx}`}
                              variant="secondary"
                              className="gap-1 px-2 py-0.5 text-xs"
                            >
                              {tag}
                              <button
                                type="button"
                                aria-label={`Remove ${tag}`}
                                onClick={() => removeTag(idx)}
                                className="-mr-0.5 rounded-sm opacity-60 hover:opacity-100"
                              >
                                <XIcon className="size-3" />
                              </button>
                            </Badge>
                          ))}
                          <input
                            value={capInput}
                            onChange={(e) => setCapInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault()
                                addTag(capInput)
                                setCapInput("")
                              } else if (e.key === "Backspace" && !capInput && tags.length > 0) {
                                removeTag(tags.length - 1)
                              }
                            }}
                            onBlur={() => {
                              if (capInput.trim()) {
                                addTag(capInput)
                                setCapInput("")
                              }
                            }}
                            placeholder={tags.length === 0 ? "e.g. Web search, SQL, Summarisation" : ""}
                            className="min-w-[8ch] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                      </FormControl>
                      <p className="text-muted-foreground text-xs">
                        Press Enter or comma to add. {tags.length}/3.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              {newAgentForm.formState.errors.root && (
                <p className="text-destructive text-sm">
                  {newAgentForm.formState.errors.root.message}
                </p>
              )}
            </form>
          </Form>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeNewAgentDialog}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" form="new-agent-form" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Typed-confirmation deletion dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setConfirmText("")
            setDeleteError(null)
          }
        }}
      >
        <DialogContent
          className="max-w-md gap-0 overflow-hidden p-0"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-4 border-b px-8 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <TriangleAlertIcon className="size-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>Delete agents</DialogTitle>
              <DialogDescription className="text-sm">
                This will permanently remove{" "}
                <span className="font-medium text-foreground">
                  {table.getFilteredSelectedRowModel().rows.length} agent
                  {table.getFilteredSelectedRowModel().rows.length !== 1 ? "s" : ""}
                </span>{" "}
                and all of their logs. This action cannot be undone.
              </DialogDescription>
            </div>
          </div>

          {/* Confirmation input */}
          <div className="flex flex-col gap-3 px-8 py-6">
            <label htmlFor="delete-confirm" className="text-xs text-muted-foreground">
              Type{" "}
              <span className="font-mono text-foreground">
                &quot;{deleteConfirmPhrase(table.getFilteredSelectedRowModel().rows.length)}&quot;
              </span>{" "}
              to confirm.
            </label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                if (deleteError) setDeleteError(null)
              }}
              autoComplete="off"
              spellCheck={false}
              disabled={isDeleting}
            />
            {deleteError && (
              <p className="text-destructive text-sm">{deleteError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 border-t px-8 py-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDeleteDialogOpen(false)
                setConfirmText("")
                setDeleteError(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={
                confirmText.trim() !==
                  deleteConfirmPhrase(table.getFilteredSelectedRowModel().rows.length) ||
                isDeleting
              }
              onClick={onDeleteConfirm}
            >
              {isDeleting ? "Deleting..." : "Delete agents"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
