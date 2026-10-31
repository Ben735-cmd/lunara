export type ClassRow = {
  id: string
  title: string
  location: string | null
  /** 0 = Sunday ... 6 = Saturday, the same as JavaScript's Date.getDay() */
  day_of_week: number
  start_time: string
  end_time: string
  remind_minutes: number
}

/** Monday first, the way a student reads a week. Values are JavaScript day numbers. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export const CLASS_REMINDERS = [
  { minutes: 0, label: "When it starts" },
  { minutes: 5, label: "5 minutes before" },
  { minutes: 10, label: "10 minutes before" },
  { minutes: 15, label: "15 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
]

/** "08:00:00" from the database becomes "08:00". */
export function hhmm(time: string) {
  return time.slice(0, 5)
}

function minutesOfDay(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + (m || 0)
}

export function sortByStart(a: ClassRow, b: ClassRow) {
  return minutesOfDay(a.start_time) - minutesOfDay(b.start_time)
}

/** Whether two classes on the same day overlap in time. */
export function overlaps(a: { start_time: string; end_time: string }, b: { start_time: string; end_time: string }) {
  return minutesOfDay(a.start_time) < minutesOfDay(b.end_time) && minutesOfDay(b.start_time) < minutesOfDay(a.end_time)
}

/** The student's time zone, saved with each class so reminders fire at the right local time. */
export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lusaka"
  } catch {
    return "Africa/Lusaka"
  }
}

/** True while the class is in progress right now. */
export function isOngoing(c: ClassRow, now: Date) {
  if (c.day_of_week !== now.getDay()) return false
  const m = now.getHours() * 60 + now.getMinutes()
  return m >= minutesOfDay(c.start_time) && m < minutesOfDay(c.end_time)
}

/** The next class that has not started yet, looking up to a week ahead. */
export function nextClass(classes: ClassRow[], now: Date): { cls: ClassRow; start: Date } | null {
  let best: { cls: ClassRow; start: Date } | null = null
  for (const cls of classes) {
    const [h, m] = cls.start_time.split(":").map(Number)
    const start = new Date(now)
    start.setHours(h, m || 0, 0, 0)
    let ahead = (cls.day_of_week - now.getDay() + 7) % 7
    if (ahead === 0 && start.getTime() <= now.getTime()) ahead = 7
    start.setDate(start.getDate() + ahead)
    if (!best || start.getTime() < best.start.getTime()) best = { cls, start }
  }
  return best
}

export function untilText(start: Date, now: Date) {
  const mins = Math.max(0, Math.round((start.getTime() - now.getTime()) / 60000))
  if (mins < 1) return "now"
  if (mins < 60) return `in ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `in ${hours} h${mins % 60 ? ` ${mins % 60} min` : ""}`
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? "" : "s"}`
}
