import { CronExpressionParser } from "cron-parser"

export type SchedulePreset =
  | "every_hour"
  | "every_3_hours"
  | "daily_9am"
  | "daily_8am"
  | "weekdays_8am"
  | "weekly_monday_9am"
  | "custom"

export const SCHEDULE_PRESETS: { value: SchedulePreset; label: string; cron: string | null }[] = [
  { value: "every_hour", label: "Every hour", cron: "0 * * * *" },
  { value: "every_3_hours", label: "Every 3 hours", cron: "0 */3 * * *" },
  { value: "daily_9am", label: "Daily at 9:00 AM", cron: "0 9 * * *" },
  { value: "daily_8am", label: "Daily at 8:00 AM", cron: "0 8 * * *" },
  { value: "weekdays_8am", label: "Weekdays at 8:00 AM", cron: "0 8 * * 1-5" },
  { value: "weekly_monday_9am", label: "Mondays at 9:00 AM", cron: "0 9 * * 1" },
  { value: "custom", label: "Custom...", cron: null },
]

export function presetCron(preset: SchedulePreset): string | null {
  return SCHEDULE_PRESETS.find((p) => p.value === preset)?.cron ?? null
}

/**
 * Given a cron expression, return the preset that matches it (so the picker can
 * highlight the right row after a page reload). Returns "custom" if no preset
 * matches.
 */
export function cronToPreset(cron: string): SchedulePreset {
  const match = SCHEDULE_PRESETS.find((p) => p.cron === cron)
  return match?.value ?? "custom"
}

export type CronValidation =
  | { ok: true; nextRunAt: Date }
  | { ok: false; error: string }

/**
 * Validate a cron expression in a given timezone and return the next fire time.
 */
export function evaluateCron(cron: string, timezone: string): CronValidation {
  try {
    const interval = CronExpressionParser.parse(cron, { tz: timezone })
    const next = interval.next().toDate()
    return { ok: true, nextRunAt: next }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid cron expression",
    }
  }
}

/**
 * Compute the next run time strictly after `after`. Used after a dispatch to
 * advance the agent's clock.
 */
export function computeNextRunAfter(
  cron: string,
  timezone: string,
  after: Date
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cron, {
      tz: timezone,
      currentDate: after,
    })
    return interval.next().toDate()
  } catch {
    return null
  }
}

/** Common IANA timezones the schedule UI offers. The free text field accepts any. */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
]
