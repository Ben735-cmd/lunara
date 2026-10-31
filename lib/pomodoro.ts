export type Mode = "focus" | "short" | "long"

export type Settings = {
  focus: number
  short: number
  long: number
  rounds: number
  autoStart: boolean
  sound: boolean
}

export type TimerState = {
  mode: Mode
  running: boolean
  /** Epoch ms when the running block ends. Null while paused. */
  endsAt: number | null
  /** Time left while paused. */
  remainingMs: number
  /** Which focus round we are on, 1-based. */
  round: number
  label: string
}

export const DEFAULT_SETTINGS: Settings = { focus: 25, short: 5, long: 15, rounds: 4, autoStart: false, sound: true }

export const MODE_LABEL: Record<Mode, string> = { focus: "Focus", short: "Short break", long: "Long break" }

const KEY = "lunara-focus-v1"

export function durationMs(mode: Mode, s: Settings) {
  return (mode === "focus" ? s.focus : mode === "short" ? s.short : s.long) * 60_000
}

export function freshState(s: Settings, mode: Mode = "focus", round = 1, label = ""): TimerState {
  return { mode, running: false, endsAt: null, remainingMs: durationMs(mode, s), round, label }
}

/** What comes after the block that just finished. */
export function nextMode(mode: Mode, round: number, s: Settings): { mode: Mode; round: number } {
  if (mode === "focus") return { mode: round >= s.rounds ? "long" : "short", round }
  if (mode === "short") return { mode: "focus", round: round + 1 }
  return { mode: "focus", round: 1 }
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function clamp(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
}

export function cleanSettings(raw: Partial<Settings> | null | undefined): Settings {
  const r = raw ?? {}
  return {
    focus: clamp(r.focus, 1, 120, DEFAULT_SETTINGS.focus),
    short: clamp(r.short, 1, 60, DEFAULT_SETTINGS.short),
    long: clamp(r.long, 1, 90, DEFAULT_SETTINGS.long),
    rounds: clamp(r.rounds, 2, 8, DEFAULT_SETTINGS.rounds),
    autoStart: typeof r.autoStart === "boolean" ? r.autoStart : DEFAULT_SETTINGS.autoStart,
    sound: typeof r.sound === "boolean" ? r.sound : DEFAULT_SETTINGS.sound,
  }
}

/** Saved settings and timer, so a refresh or a closed tab does not lose a running block. */
export function loadSaved(): { settings: Settings; timer: TimerState } {
  let settings = DEFAULT_SETTINGS
  let timer: TimerState | null = null
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null")
    if (raw) {
      settings = cleanSettings(raw.settings)
      const t = raw.timer
      if (t && ["focus", "short", "long"].includes(t.mode)) {
        timer = {
          mode: t.mode,
          running: !!t.running && typeof t.endsAt === "number",
          endsAt: typeof t.endsAt === "number" ? t.endsAt : null,
          remainingMs: clamp(t.remainingMs, 0, 4 * 3600_000, durationMs(t.mode, settings)),
          round: clamp(t.round, 1, 8, 1),
          label: typeof t.label === "string" ? t.label.slice(0, 80) : "",
        }
      }
    }
  } catch {
    // storage unavailable or corrupt: start fresh
  }
  return { settings, timer: timer ?? freshState(settings) }
}

export function save(settings: Settings, timer: TimerState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ settings, timer }))
  } catch {
    // private mode: the timer still works, it just won't survive a refresh
  }
}

/** A short two-note chime. Must be created from a click so browsers allow audio. */
export function makeChime(): (() => void) | null {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    return () => {
      if (ctx.state === "suspended") ctx.resume().catch(() => {})
      const t0 = ctx.currentTime
      ;[660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.value = freq
        const at = t0 + i * 0.22
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.exponentialRampToValueAtTime(0.35, at + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7)
        osc.connect(gain).connect(ctx.destination)
        osc.start(at)
        osc.stop(at + 0.75)
      })
    }
  } catch {
    return null
  }
}
