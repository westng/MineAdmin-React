import type {
  GanttDateRange,
  GanttEvent,
  GanttOccurrence,
  GanttRecurrenceRule,
  GanttWeekday,
} from "@/components/reui/gantt/gantt-types"
import { TZDate } from "@date-fns/tz"
import { addDays, addMonths, addWeeks, addYears } from "date-fns"

/** Guard: max occurrences per event per expansion. */
const MAX_OCCURRENCES = 1000

const WEEKDAYS: GanttWeekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]

class GanttRecurrenceError extends Error {
  constructor(part: string) {
    super(
      `Unsupported recurrence part: ${part}. Use the getOccurrences prop to plug a full RRULE engine for exotic rules.`
    )
    this.name = "GanttRecurrenceError"
  }
}

/**
 * Parses a raw RRULE line (with or without the "RRULE:" prefix) into the
 * structured subset. Pass the display time zone so a floating UNTIL
 * (no trailing Z) resolves there instead of in the runtime's local zone.
 */
function parseRRuleString(
  input: string,
  timeZone?: string
): GanttRecurrenceRule {
  const body = input.trim().replace(/^RRULE:/i, "")
  const rule: Partial<GanttRecurrenceRule> = {}

  for (const pair of body.split(";")) {
    if (!pair) continue
    const [rawKey, rawValue] = pair.split("=")
    const key = rawKey?.toUpperCase()
    const value = rawValue ?? ""

    switch (key) {
      case "FREQ": {
        const freq = value.toLowerCase()
        if (
          freq !== "daily" &&
          freq !== "weekly" &&
          freq !== "monthly" &&
          freq !== "yearly"
        ) {
          throw new GanttRecurrenceError(`FREQ=${value}`)
        }
        rule.freq = freq
        break
      }
      case "INTERVAL":
        rule.interval = Math.max(1, parseInt(value, 10) || 1)
        break
      case "COUNT":
        rule.count = Math.max(1, parseInt(value, 10) || 1)
        break
      case "UNTIL":
        rule.until = parseRRuleDate(value, timeZone)
        break
      case "BYDAY":
        rule.byWeekday = value.split(",").map((token) => {
          const match = /^(-?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(token.trim())
          if (!match) throw new GanttRecurrenceError(`BYDAY=${token}`)
          const day = match[2] as GanttWeekday
          return match[1] ? { day, ordinal: parseInt(match[1], 10) } : day
        })
        break
      case "BYMONTHDAY":
        rule.byMonthDay = value.split(",").map((v) => parseInt(v, 10))
        break
      case "BYMONTH":
        rule.byMonth = value.split(",").map((v) => parseInt(v, 10))
        break
      case "WKST": {
        if (!WEEKDAYS.includes(value as GanttWeekday)) {
          throw new GanttRecurrenceError(`WKST=${value}`)
        }
        rule.weekStart = value as GanttWeekday
        break
      }
      default:
        throw new GanttRecurrenceError(key ?? pair)
    }
  }

  if (!rule.freq) throw new GanttRecurrenceError("missing FREQ")
  return rule as GanttRecurrenceRule
}

function parseRRuleDate(value: string, timeZone?: string): Date {
  // RFC 5545 basic formats: YYYYMMDD or YYYYMMDDTHHMMSS(Z)
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(
    value
  )
  if (!match) throw new GanttRecurrenceError(`UNTIL=${value}`)
  const [, y, m, d, hh = "23", mm = "59", ss = "59", z] = match
  // Floating (non-Z) boundaries resolve in the DISPLAY zone when known -
  // local-zone parsing would shift the series end per visitor machine.
  const date =
    !z && timeZone
      ? new TZDate(+y, +m - 1, +d, +hh, +mm, +ss, timeZone)
      : new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}${z ? "Z" : ""}`)
  if (Number.isNaN(date.getTime())) {
    throw new GanttRecurrenceError(`UNTIL=${value}`)
  }
  return new Date(date.getTime())
}

/** Serializes the structured subset back to an RRULE line (without prefix). */
function formatRRuleString(rule: GanttRecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.freq.toUpperCase()}`]
  if (rule.interval && rule.interval > 1)
    parts.push(`INTERVAL=${rule.interval}`)
  if (rule.count) parts.push(`COUNT=${rule.count}`)
  if (rule.until) {
    const u = rule.until
    const pad = (n: number) => String(n).padStart(2, "0")
    parts.push(
      `UNTIL=${u.getUTCFullYear()}${pad(u.getUTCMonth() + 1)}${pad(u.getUTCDate())}T${pad(u.getUTCHours())}${pad(u.getUTCMinutes())}${pad(u.getUTCSeconds())}Z`
    )
  }
  if (rule.byWeekday?.length) {
    parts.push(
      `BYDAY=${rule.byWeekday
        .map((d) => (typeof d === "string" ? d : `${d.ordinal}${d.day}`))
        .join(",")}`
    )
  }
  if (rule.byMonthDay?.length)
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(",")}`)
  if (rule.byMonth?.length) parts.push(`BYMONTH=${rule.byMonth.join(",")}`)
  if (rule.weekStart) parts.push(`WKST=${rule.weekStart}`)
  return parts.join(";")
}

function resolveRule(
  recurrence: GanttRecurrenceRule | string,
  timeZone?: string
): GanttRecurrenceRule {
  return typeof recurrence === "string"
    ? parseRRuleString(recurrence, timeZone)
    : recurrence
}

/**
 * Expands one event into its occurrences intersecting the range.
 * Non-recurring events yield at most one occurrence. Recurrence iteration is
 * wall-time based in the display zone (DST-safe day/week/month steps).
 *
 * Supported subset: FREQ daily/weekly/monthly/yearly, INTERVAL, COUNT, UNTIL,
 * weekly BYDAY (no ordinals). Parsed-but-unimplemented filters (BYMONTHDAY,
 * BYMONTH, BYDAY outside weekly) throw a GanttRecurrenceError instead of
 * silently mis-expanding; plug the getOccurrences prop for a full engine.
 * WKST aligns interval weeks; the existing default remains Sunday.
 *
 * exDates remove exactly-matching instants (after COUNT numbering,
 * Google-style: an exception still consumes its COUNT slot); rDates add extra
 * instants with the same duration. RECURRENCE-ID override replacement lives
 * in buildEventIndex, where the override event and its parent series meet.
 */
function expandRecurrence<TData>(
  event: GanttEvent<TData>,
  range: GanttDateRange,
  ctx: { timeZone: string }
): GanttOccurrence<TData>[] {
  if (![event.start, event.end, range.start, range.end].every((date) => Number.isFinite(date.getTime())) ||
    range.end <= range.start || event.end < event.start) return []
  const allDay = event.allDay ?? false

  if (!event.recurrence) {
    // Same rule as occurrenceIntersects in gantt-lib, inlined (importing it
    // back would cycle the modules): half-open, except a zero-length
    // milestone sitting exactly on the range start stays visible.
    const visible =
      event.end.getTime() === event.start.getTime()
        ? event.start >= range.start && event.start < range.end
        : event.start < range.end && event.end > range.start
    if (visible) {
      return [
        {
          key: `${event.id}::${event.start.toISOString()}`,
          eventId: event.id,
          event,
          start: event.start,
          end: event.end,
          allDay,
          isRecurring: false,
        },
      ]
    }
    return []
  }

  const rule = resolveRule(event.recurrence, ctx.timeZone)
  // Loud contract: silently ignoring a filter would emit WRONG occurrences.
  if (rule.byMonthDay?.length) throw new GanttRecurrenceError("BYMONTHDAY")
  if (rule.byMonth?.length) throw new GanttRecurrenceError("BYMONTH")
  if (rule.byWeekday?.length && rule.freq !== "weekly") {
    throw new GanttRecurrenceError("BYDAY outside FREQ=WEEKLY")
  }
  const interval = Math.max(1, rule.interval ?? 1)
  const durationMs = event.end.getTime() - event.start.getTime()
  const zonedStart = new TZDate(event.start.getTime(), ctx.timeZone)
  // Excluded instants matched exactly; filtering happens at push time so an
  // exception still consumes its COUNT slot (Google-style numbering).
  const exTimes = new Set((rule.exDates ?? []).map((d) => d.getTime()))

  const weeklyDays: number[] | null =
    rule.freq === "weekly" && rule.byWeekday?.length
      ? rule.byWeekday.map((d) => {
          if (typeof d !== "string") {
            throw new GanttRecurrenceError(
              "BYDAY ordinal outside monthly/yearly"
            )
          }
          return WEEKDAYS.indexOf(d)
        })
      : null

  const daySpan = Math.round(durationMs / 86400000)
  const wallDaySpan =
    allDay && daySpan > 0 &&
    addDays(zonedStart, daySpan).getTime() === event.end.getTime()
      ? daySpan
      : null
  const endFor = (start: Date): Date =>
    wallDaySpan === null
      ? new Date(start.getTime() + durationMs)
      : new Date(addDays(new TZDate(start.getTime(), ctx.timeZone), wallDaySpan).getTime())

  const weekStartIndex = WEEKDAYS.indexOf(rule.weekStart ?? "SU")
  const fromWeekStart = (day: number) => (day - weekStartIndex + 7) % 7
  const days = weeklyDays ? [...new Set(weeklyDays)] : null
  // Every period comes from DTSTART, never from a previously clamped date.
  const anchorFor = (period: number): TZDate =>
    rule.freq === "daily"
      ? addDays(zonedStart, period * interval)
      : rule.freq === "weekly"
        ? addWeeks(zonedStart, period * interval)
        : rule.freq === "monthly"
          ? addMonths(zonedStart, period * interval)
          : addYears(zonedStart, period * interval)

  const candidatesFor = (period: number): TZDate[] => {
    const base = anchorFor(period)
    if (days) {
      const week: TZDate[] = []
      const baseOffset = fromWeekStart(base.getDay())
      for (let offset = 0; offset < 7; offset++) {
        const candidate = addDays(base, offset - baseOffset)
        if (days.includes(candidate.getDay()) && candidate >= zonedStart) week.push(candidate)
      }
      return week
    }
    // RFC 5545: invalid dates are ignored and do not consume COUNT.
    if ((rule.freq === "monthly" || rule.freq === "yearly") &&
      base.getDate() !== zonedStart.getDate()) return []
    return [base]
  }
  const periodEdge = (period: number, last = false): TZDate => {
    const base = anchorFor(period)
    return days ? addDays(base, (last ? 6 : 0) - fromWeekStart(base.getDay())) : base
  }

  // A conservative jump followed by exact refinement keeps old series cheap.
  // The longest wall-time period plus DST slack cannot jump past the window.
  const maxStepMs = ({ daily: 1, weekly: 7, monthly: 31, yearly: 366 }[rule.freq] *
    86400000 * interval) + 3600000
  const gap = range.start.getTime() - durationMs - (days ? 7 * 86400000 : 0) -
    zonedStart.getTime()
  let period = Math.max(0, Math.floor(gap / maxStepMs) - 1)
  while (true) {
    const end = endFor(periodEdge(period, true)).getTime()
    if (!Number.isFinite(end)) break
    if (durationMs === 0 ? end >= range.start.getTime() : end > range.start.getTime()) break
    period++
  }
  let index = 0
  if (rule.freq === "monthly" || rule.freq === "yearly") {
    for (let skipped = 0; skipped < period; skipped++) {
      index += candidatesFor(skipped).length
      if (rule.count !== undefined && index >= rule.count) break
    }
  } else if (days && period > 0) {
    index = candidatesFor(0).length + (period - 1) * days.length
  } else {
    index = period
  }

  const occurrences: GanttOccurrence<TData>[] = []
  const pushIfVisible = (candidate: Date) => {
    const start = new Date(candidate.getTime())
    if (exTimes.has(start.getTime())) return
    const end = endFor(start)
    const visible = durationMs === 0
      ? start >= range.start && start < range.end
      : start < range.end && end > range.start
    if (visible) occurrences.push({
      key: `${event.id}::${start.toISOString()}`,
      eventId: event.id,
      event,
      start,
      end,
      allDay,
      isRecurring: true,
      recurrenceIndex: index,
    })
  }

  for (let iterations = 0; iterations < 10000 && occurrences.length < MAX_OCCURRENCES; iterations++, period++) {
    if (rule.count !== undefined && index >= rule.count) break
    // Check the earliest candidate in the whole WKST-aligned period, not the
    // DTSTART weekday: a Monday may precede UNTIL even if Tuesday does not.
    const earliest = periodEdge(period)
    if (!Number.isFinite(earliest.getTime())) break
    if (earliest >= range.end || (rule.until && earliest > rule.until)) break
    let ended = false
    for (const candidate of candidatesFor(period)) {
      if ((rule.count !== undefined && index >= rule.count) ||
        (rule.until && candidate > rule.until)) {
        ended = true
        break
      }
      pushIfVisible(candidate)
      index++
      if (occurrences.length >= MAX_OCCURRENCES) break
    }
    if (ended) break
  }

  // RDATE: extra instants join the set (deduped against generated starts and
  // exclusions) with the same wall-time duration. Sorted so direct consumers
  // still receive chronological order (buildEventIndex re-sorts regardless).
  if (rule.rDates?.length) {
    const seen = new Set(occurrences.map((o) => o.start.getTime()))
    for (const rDate of rule.rDates) {
      const start = new Date(rDate.getTime())
      if (seen.has(start.getTime()) || exTimes.has(start.getTime())) continue
      const end = endFor(start)
      // mirrored visibility rule: zero-length RDATEs stay closed at the start
      const hidden =
        durationMs === 0
          ? start < range.start || start >= range.end
          : start >= range.end || end <= range.start
      if (hidden) continue
      seen.add(start.getTime())
      occurrences.push({
        key: `${event.id}::${start.toISOString()}`,
        eventId: event.id,
        event,
        start,
        end,
        allDay,
        isRecurring: true,
        // keep counting past the generated instants: an RDATE with no index
        // would fall back to 0 and collide with the series' first occurrence
        // in any consumer that identifies an instance by its position
        recurrenceIndex: index++,
      })
    }
    occurrences.sort((a, b) => a.start.getTime() - b.start.getTime())
  }

  return occurrences
}

export {
  GanttRecurrenceError,
  expandRecurrence,
  formatRRuleString,
  MAX_OCCURRENCES,
  parseRRuleString,
}
