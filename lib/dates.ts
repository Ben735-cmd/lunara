/** One date style for the whole app: "Thu 29 Oct 2026" (day first). Accepts "2026-10-29" or a Date or an ISO timestamp. */
export function formatDate(value: string | Date, opts: { weekday?: boolean; year?: boolean } = {}) {
  const { weekday = true, year = true } = opts
  const d = typeof value === "string" ? (/^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00") : new Date(value)) : value
  if (Number.isNaN(d.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  return [weekday ? get("weekday") : "", get("day"), get("month"), year ? get("year") : ""].filter(Boolean).join(" ")
}

/** Long form for headings: "Thursday 29 October". */
export function formatDateLong(value: string | Date) {
  const d = typeof value === "string" ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T00:00:00" : value) : value
  if (Number.isNaN(d.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  return `${get("weekday")} ${get("day")} ${get("month")}`
}
