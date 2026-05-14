"use client"

import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SearchTrigger() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-muted-foreground relative h-8 w-full justify-start gap-2 text-sm sm:w-52 md:w-64"
      onClick={() => document.dispatchEvent(new Event("command-menu:open"))}
    >
      <SearchIcon className="size-3.5" />
      <span className="hidden sm:inline-flex">Search...</span>
      <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  )
}
