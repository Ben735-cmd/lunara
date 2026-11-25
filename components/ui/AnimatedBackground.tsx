import { BookOpen, BookMarked, Pencil, Lightbulb, GraduationCap, Atom, Calculator, NotebookPen, Brain, Sigma, Library, Moon, type LucideIcon } from "lucide-react"

// A slow, soft background for the app: drifting green glows and a few twinkling
// stars (a nod to the Lunara moon). It sits behind everything, never takes
// clicks, and only animates transform and opacity so it stays cheap on phones.
// Motion is switched off for people who prefer reduced motion (see globals.css).
// The parent must create a stacking context (use "relative isolate").

// Star positions come from a seeded generator, so the server and the browser render the same markup.
function makeStars(count: number) {
  let seed = 20251101
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  return Array.from({ length: count }, () => ({
    top: next() * 100,
    left: next() * 100,
    delay: next() * 6,
    duration: 3 + next() * 4,
    size: next() < 0.2 ? 3 : next() < 0.5 ? 2 : 1.5,
  }))
}

const STARS = makeStars(80)

// Books and study things drifting slowly behind the page. Seeded like the stars so the markup matches on the server.
const STUDY_ICONS: LucideIcon[] = [BookOpen, Pencil, Lightbulb, GraduationCap, BookMarked, Atom, Calculator, NotebookPen, Brain, Sigma, Library, Moon]

function makeStudyThings(count: number) {
  let seed = 7731
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  return Array.from({ length: count }, (_, i) => ({
    Icon: STUDY_ICONS[i % STUDY_ICONS.length],
    top: 4 + next() * 88,
    left: 2 + next() * 94,
    size: 26 + Math.round(next() * 34),
    duration: 16 + next() * 18,
    delay: -next() * 20,
    dx: Math.round((next() - 0.5) * 70),
    dy: -Math.round(18 + next() * 46),
    r0: Math.round((next() - 0.5) * 24),
    r1: Math.round((next() - 0.5) * 40),
    strong: next() < 0.3,
  }))
}

const STUDY_THINGS = makeStudyThings(18)

export default function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-blob bg-blob-a absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/[0.17] blur-3xl" />
      <div className="bg-blob bg-blob-b absolute -right-32 top-1/3 h-[32rem] w-[32rem] rounded-full bg-accent/[0.13] blur-3xl" />
      <div className="bg-blob bg-blob-c absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-accent/[0.17] blur-3xl" />
      {STUDY_THINGS.map(({ Icon, top, left, size, duration, delay, dx, dy, r0, r1, strong }, i) => (
        <span
          key={`study-${i}`}
          className={`study-float absolute text-accent ${strong ? "opacity-[0.22]" : "opacity-[0.13]"}`}
          style={{
            top: `${top}%`,
            left: `${left}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            ["--dx" as string]: `${dx}px`,
            ["--dy" as string]: `${dy}px`,
            ["--r0" as string]: `${r0}deg`,
            ["--r1" as string]: `${r1}deg`,
          }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </span>
      ))}
      {STARS.map((star, i) => (
        <span
          key={i}
          className="bg-star absolute rounded-full bg-accent"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
