"use client"

import * as React from "react"
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
  PauseIcon,
  PlayIcon,
  PlusIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

type AgentStatus = "active" | "idle" | "paused"

type Agent = {
  id: number
  name: string
  description: string
  model: string
  status: AgentStatus
  tasksCompleted: number
  lastActive: string
  capabilities: string[]
}

const agentsData: Agent[] = [
  {
    id: 1,
    name: "Research Agent",
    description: "Searches the web and delivers structured summaries on demand.",
    model: "Claude Opus 4.7",
    status: "active",
    tasksCompleted: 142,
    lastActive: "Just now",
    capabilities: ["Web search", "Summarisation", "Citation"],
  },
  {
    id: 2,
    name: "Data Analyst",
    description: "Queries datasets, runs statistical analysis, and generates reports.",
    model: "Claude Sonnet 4.6",
    status: "active",
    tasksCompleted: 87,
    lastActive: "2 min ago",
    capabilities: ["SQL", "Charting", "Forecasting"],
  },
  {
    id: 3,
    name: "Code Reviewer",
    description: "Reviews pull requests for bugs, security issues, and style compliance.",
    model: "Claude Sonnet 4.6",
    status: "idle",
    tasksCompleted: 214,
    lastActive: "1 hr ago",
    capabilities: ["Code review", "Security scan", "Suggestions"],
  },
  {
    id: 4,
    name: "Customer Support",
    description: "Handles first-line inquiries, routes complex cases, and drafts responses.",
    model: "Claude Haiku 4.5",
    status: "active",
    tasksCompleted: 1038,
    lastActive: "Just now",
    capabilities: ["Triage", "Drafting", "Escalation"],
  },
  {
    id: 5,
    name: "Content Writer",
    description: "Drafts blog posts, documentation, and marketing copy from briefs.",
    model: "Claude Sonnet 4.6",
    status: "paused",
    tasksCompleted: 56,
    lastActive: "3 days ago",
    capabilities: ["Copywriting", "SEO", "Editing"],
  },
  {
    id: 6,
    name: "Email Assistant",
    description: "Monitors your inbox, drafts replies, and flags priority threads.",
    model: "Claude Haiku 4.5",
    status: "paused",
    tasksCompleted: 329,
    lastActive: "2 days ago",
    capabilities: ["Inbox triage", "Drafting", "Scheduling"],
  },
]

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
            <DropdownMenuItem>Configure</DropdownMenuItem>
            <DropdownMenuItem>View logs</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

export default function AgentsPage() {
  const [data] = React.useState(agentsData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

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
            <Button size="sm">
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
    </div>
  )
}
