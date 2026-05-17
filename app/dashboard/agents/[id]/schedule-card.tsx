"use client"

import * as React from "react"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { CalendarClockIcon, SaveIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COMMON_TIMEZONES,
  SCHEDULE_PRESETS,
  cronToPreset,
  evaluateCron,
  presetCron,
  type SchedulePreset,
} from "@/lib/scheduling"
import { setAgentSchedule } from "../actions"

export type ScheduleSnapshot = {
  enabled: boolean
  cron: string | null
  timezone: string
  nextRunAt: Date | null
}

export function ScheduleCard({
  agentId,
  initial,
  isAdmin,
}: {
  agentId: number
  initial: ScheduleSnapshot
  isAdmin: boolean
}) {
  const [enabled, setEnabled] = React.useState(initial.enabled)
  const [timezone, setTimezone] = React.useState(initial.timezone)
  const [preset, setPreset] = React.useState<SchedulePreset>(() =>
    initial.cron ? cronToPreset(initial.cron) : "daily_9am"
  )
  const [cron, setCron] = React.useState(initial.cron ?? "0 9 * * *")
  const [isPending, startTransition] = React.useTransition()

  // When the preset changes, sync the cron field unless it's "custom".
  React.useEffect(() => {
    const newCron = presetCron(preset)
    if (newCron !== null) setCron(newCron)
  }, [preset])

  const preview = React.useMemo(() => {
    if (!enabled || !cron.trim()) return null
    const result = evaluateCron(cron.trim(), timezone)
    return result
  }, [enabled, cron, timezone])

  const dirty =
    enabled !== initial.enabled ||
    timezone !== initial.timezone ||
    (cron || "") !== (initial.cron || "")

  function onSave() {
    startTransition(async () => {
      try {
        const result = await setAgentSchedule({
          agentId,
          enabled,
          cron: cron.trim() || null,
          timezone,
        })
        if (result.nextRunAt) {
          toast.success(
            `Schedule saved — next run ${formatDistanceToNow(new Date(result.nextRunAt), { addSuffix: true })}`
          )
        } else {
          toast.success("Schedule disabled")
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save schedule.")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm">Schedule</CardTitle>
          <CardDescription className="text-xs">
            When this agent should run on its own.
            {!isAdmin && " Only org admins can change this."}
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={onSave} disabled={!dirty || isPending}>
            <SaveIcon />
            {isPending ? "Saving..." : "Save schedule"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Run on a schedule</span>
            <span className="text-xs text-muted-foreground">
              {enabled
                ? "Agent runs autonomously per the cron expression below."
                : "Agent only runs when someone clicks Run now."}
            </span>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={!isAdmin}
            className="size-4 rounded border-input"
          />
        </div>

        {enabled && (
          <>
            {/* Preset */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="schedule-preset" className="text-xs">Frequency</Label>
              <Select
                value={preset}
                onValueChange={(v) => setPreset(v as SchedulePreset)}
                disabled={!isAdmin}
              >
                <SelectTrigger id="schedule-preset" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom cron */}
            {preset === "custom" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="schedule-cron" className="text-xs">
                  Cron expression
                </Label>
                <Input
                  id="schedule-cron"
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="0 9 * * *"
                  disabled={!isAdmin}
                  className="font-mono"
                />
                <span className="text-[10px] text-muted-foreground">
                  Standard 5-field cron syntax (minute, hour, day, month, weekday).
                </span>
              </div>
            )}

            {/* Timezone */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="schedule-tz" className="text-xs">Timezone</Label>
              <Select
                value={timezone}
                onValueChange={setTimezone}
                disabled={!isAdmin}
              >
                <SelectTrigger id="schedule-tz" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                  {!COMMON_TIMEZONES.includes(timezone) && (
                    <SelectItem value={timezone}>{timezone}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-1 rounded-md border bg-muted/30 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Next run
              </span>
              {preview?.ok ? (
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <CalendarClockIcon className="size-3.5" />
                    {format(preview.nextRunAt, "PPpp")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(preview.nextRunAt, { addSuffix: true })}
                  </span>
                </div>
              ) : preview && !preview.ok ? (
                <Badge variant="destructive" className="w-fit">
                  {preview.error}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
