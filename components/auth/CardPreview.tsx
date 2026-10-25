import { schedule, describeInterval, type Grade } from "../../lib/sm2"

// A card that has been reviewed once. The intervals below come from the same
// scheduler the app uses, so the preview shows what a student would really see.
const reviewedOnce = { ease: 2.5, interval_days: 1, repetitions: 1 }

const grades: { grade: Grade; label: string }[] = [
  { grade: 0, label: "Again" },
  { grade: 1, label: "Hard" },
  { grade: 2, label: "Good" },
  { grade: 3, label: "Easy" },
]

export default function CardPreview() {
  return (
    <div aria-hidden="true" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6">
      <p className="text-lg font-medium leading-snug text-ink">
        What does a process control block store?
      </p>
      <p className="mt-4 border-t border-line pt-4 text-[0.95rem] leading-relaxed text-ink-muted">
        Everything the OS needs to pause and resume a process: its ID, state,
        program counter, registers, and memory and I/O information.
      </p>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {grades.map(({ grade, label }) => (
          <div key={grade} className="rounded-lg border border-line px-2 py-2 text-center">
            <p className="text-sm font-medium text-ink">{label}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {describeInterval(schedule(reviewedOnce, grade))}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
