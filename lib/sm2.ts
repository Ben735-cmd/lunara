// Spaced repetition scheduling (SM-2 variant) for flashcards.

export type Grade = 0 | 1 | 2 | 3 // Again, Hard, Good, Easy

export type Schedule = {
  ease: number
  interval_days: number
  repetitions: number
}

export type ScheduleResult = Schedule & { due_at: Date }

const QUALITY: Record<Grade, number> = { 0: 1, 1: 3, 2: 4, 3: 5 }
const MIN_EASE = 1.3
const AGAIN_DELAY_MS = 10 * 60 * 1000

export function schedule(card: Schedule, grade: Grade, now = new Date()): ScheduleResult {
  const q = QUALITY[grade]
  const ease = Math.max(
    MIN_EASE,
    card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  )

  if (grade === 0) {
    return {
      ease,
      interval_days: 0,
      repetitions: 0,
      due_at: new Date(now.getTime() + AGAIN_DELAY_MS),
    }
  }

  const repetitions = card.repetitions + 1
  let interval: number
  if (repetitions === 1) interval = 1
  else if (repetitions === 2) interval = 6
  else interval = Math.round(card.interval_days * ease)

  if (grade === 1) interval = Math.max(1, Math.round(interval * 0.8))
  if (grade === 3) interval = Math.round(interval * 1.3)
  interval = Math.max(1, interval)

  return {
    ease,
    interval_days: interval,
    repetitions,
    due_at: new Date(now.getTime() + interval * 24 * 60 * 60 * 1000),
  }
}

export function describeInterval(result: ScheduleResult): string {
  if (result.interval_days === 0) return "10 min"
  if (result.interval_days === 1) return "1 day"
  return `${result.interval_days} days`
}
