// Keeps notes usable without a connection. The last list of notes is saved on this device,
// and anything written or deleted while offline waits in a queue until the connection is back.

export type Note = { id: string; title: string; content: string; created_at: string; pending?: boolean }
type Op =
  | { type: "add"; tempId: string; title: string; content: string; created_at: string }
  | { type: "delete"; id: string }
type Store = { userId: string; notes: Note[]; queue: Op[] }

const KEY = "lunara-notes-v1"

function read(userId: string): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Store
      if (parsed.userId === userId) return parsed
    }
  } catch { /* unreadable cache, start fresh */ }
  return { userId, notes: [], queue: [] }
}

function write(store: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* storage full or blocked */ }
}

export function isNetworkError(error: { message?: string } | null | undefined) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true
  return !!error?.message && /failed to fetch|network|load failed|timeout/i.test(error.message)
}

/** The notes to show: saved server notes minus queued deletes, plus notes waiting to upload. */
export function visibleNotes(userId: string): Note[] {
  const { notes, queue } = read(userId)
  const deleted = new Set(queue.filter((o): o is Extract<Op, { type: "delete" }> => o.type === "delete").map((o) => o.id))
  const waiting: Note[] = queue
    .filter((o): o is Extract<Op, { type: "add" }> => o.type === "add")
    .map((o) => ({ id: o.tempId, title: o.title, content: o.content, created_at: o.created_at, pending: true }))
  return [...waiting, ...notes.filter((n) => !deleted.has(n.id))].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function cacheServerNotes(userId: string, notes: Note[]) {
  const store = read(userId)
  write({ ...store, notes })
}

export function queueAdd(userId: string, title: string, content: string) {
  const store = read(userId)
  const op: Op = { type: "add", tempId: `local-${crypto.randomUUID()}`, title, content, created_at: new Date().toISOString() }
  write({ ...store, queue: [...store.queue, op] })
}

/** Deleting a note that never uploaded just cancels it. Otherwise the delete waits for the connection. */
export function queueDelete(userId: string, id: string) {
  const store = read(userId)
  if (id.startsWith("local-")) {
    write({ ...store, queue: store.queue.filter((o) => !(o.type === "add" && o.tempId === id)) })
    return
  }
  write({ ...store, queue: [...store.queue, { type: "delete", id }] })
}

export function pendingCount(userId: string) {
  return read(userId).queue.length
}

type Runner = {
  insert: (note: { title: string; content: string; created_at: string }) => Promise<{ message?: string } | null>
  remove: (id: string) => Promise<{ message?: string } | null>
}

/** Sends the waiting changes in order. Stops at the first connection problem and keeps the rest for later. */
export async function flushQueue(userId: string, run: Runner): Promise<number> {
  const store = read(userId)
  const remaining: Op[] = []
  let sent = 0
  let stopped = false
  for (const op of store.queue) {
    if (stopped) { remaining.push(op); continue }
    const error = op.type === "add"
      ? await run.insert({ title: op.title, content: op.content, created_at: op.created_at })
      : await run.remove(op.id)
    if (error && isNetworkError(error)) { stopped = true; remaining.push(op); continue }
    if (error) continue // a real rejection (for example the note is already gone): drop it so it cannot block the queue
    sent++
  }
  write({ ...read(userId), queue: remaining })
  return sent
}
