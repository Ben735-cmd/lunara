// Course progress is calculated from real study activity. Nothing about it is
// typed in or stored by the student, so it cannot be set by hand.
//
//   Flashcards (55%): how well the cards are remembered. A card counts fully once
//     its review interval reaches 14 days, and the interval only grows by
//     reviewing the card over several days, so it cannot be rushed.
//   Quizzes (45%): the average score of the last 5 attempts, with full weight
//     after 3 attempts so one lucky quiz is not enough.

export const FLASHCARD_WEIGHT = 0.55
export const QUIZ_WEIGHT = 0.45
export const MASTERED_INTERVAL_DAYS = 14
const QUIZ_ATTEMPTS_COUNTED = 5
const QUIZ_ATTEMPTS_FOR_FULL_WEIGHT = 3

export type CardStat = { interval_days: number }
export type QuizAttempt = { score: number; total: number; created_at: string }

export type ProgressBreakdown = {
  progress: number // 0-100
  flashcards: { percent: number; cards: number; mastered: number }
  quizzes: { percent: number; attempts: number; average: number }
}

export function calculateProgress(cards: CardStat[], attempts: QuizAttempt[]): ProgressBreakdown {
  const cardScore = cards.length
    ? cards.reduce((sum, c) => sum + Math.min(Math.max(c.interval_days, 0) / MASTERED_INTERVAL_DAYS, 1), 0) / cards.length
    : 0
  const mastered = cards.filter((c) => c.interval_days >= MASTERED_INTERVAL_DAYS).length

  const recent = [...attempts]
    .filter((a) => a.total > 0)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, QUIZ_ATTEMPTS_COUNTED)
  const average = recent.length ? recent.reduce((sum, a) => sum + a.score / a.total, 0) / recent.length : 0
  const quizScore = average * Math.min(recent.length / QUIZ_ATTEMPTS_FOR_FULL_WEIGHT, 1)

  return {
    progress: Math.round(100 * (FLASHCARD_WEIGHT * cardScore + QUIZ_WEIGHT * quizScore)),
    flashcards: { percent: Math.round(cardScore * 100), cards: cards.length, mastered },
    quizzes: { percent: Math.round(quizScore * 100), attempts: recent.length, average: Math.round(average * 100) },
  }
}
