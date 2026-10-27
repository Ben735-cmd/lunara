import AnimatedBackground from "./AnimatedBackground"

// Skeleton placeholders shown while data loads. They use the theme tokens, so
// they follow light and dark mode. The pulse stops for people who prefer
// reduced motion (see globals.css).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-line ${className}`} />
}

const shell = "w-full flex-1 overflow-hidden px-5 pb-8 pt-[88px] md:px-12 md:py-11"
const panel = "rounded-xl border border-line bg-surface"

function Region({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <section role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </section>
  )
}

function PageHeader({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Skeleton className="h-9 w-48" />
      {action && <Skeleton className="h-10 w-36 rounded-lg" />}
    </div>
  )
}

function StatRow({ count }: { count: number }) {
  return (
    <div
      className={`mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line ${
        count === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"
      }`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface p-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-4 h-8 w-14" />
        </div>
      ))}
    </div>
  )
}

function ListRows({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4">
          <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      ))}
    </div>
  )
}

/** Dashboard home: stat row, courses panel and tasks panel. */
export function DashboardSkeleton() {
  return (
    <>
      <PageHeader action={false} />
      <StatRow count={4} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className={`${panel} p-6`}>
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-4">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="mt-2 h-3 w-16" />
                <div className="mt-4 flex items-center gap-3">
                  <Skeleton className="h-1.5 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`${panel} h-fit p-6`}>
          <Skeleton className="mb-4 h-6 w-36" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="mt-4 divide-y divide-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-14 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/** The full app shell for the very first load, before we know who is signed in. */
export function AppSkeleton() {
  return <DashboardLoading dark={false} />
}

/** Dashboard home while its data loads (sidebar already on screen). */
export function DashboardLoading({ dark }: { dark: boolean }) {
  return (
    <main className={`${dark ? "dark" : ""} relative isolate flex min-h-screen bg-paper`} role="status" aria-busy="true" aria-label="Loading dashboard">
      <AnimatedBackground />
      <aside className="hidden min-h-screen w-[260px] flex-col justify-between border-r border-line bg-surface px-3 py-6 md:flex">
        <div>
          <div className="mb-8 flex items-center gap-3 px-3">
            <Skeleton className="h-9 w-9 rounded-[22%]" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </aside>
      <section className={shell}>
        <DashboardSkeleton />
      </section>
    </main>
  )
}

export function AssignmentsSkeleton() {
  return (
    <Region label="Loading assignments" className={shell}>
      <PageHeader />
      <StatRow count={3} />
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="hidden h-11 w-64 rounded-lg sm:block" />
      </div>
      <div className={`${panel} mt-5 px-5`}>
        <ListRows rows={5} />
      </div>
    </Region>
  )
}

export function NotesSkeleton() {
  return (
    <Region label="Loading notes" className={shell}>
      <PageHeader />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${panel} p-5`}>
            <Skeleton className="h-5 w-2/3" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="mt-5 h-3 w-24" />
          </div>
        ))}
      </div>
    </Region>
  )
}

export function CalendarSkeleton() {
  return (
    <Region label="Loading calendar" className={shell}>
      <PageHeader />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className={`${panel} p-6`}>
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </div>
        <div className={`${panel} h-fit p-6`}>
          <Skeleton className="h-6 w-32" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Region>
  )
}

export function CourseSkeleton() {
  return (
    <Region label="Loading course" className={shell}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-20 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Skeleton className="h-[50px] w-full rounded-xl" />
          <div className={`${panel} space-y-3 p-6`}>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="space-y-4">
          <div className={`${panel} p-6`}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mx-auto mt-6 h-12 w-28" />
            <Skeleton className="mt-6 h-1.5 w-full rounded-full" />
            <Skeleton className="mt-6 h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </Region>
  )
}

/** Shown inside a course tab while the AI is generating content. */
export function GeneratingSkeleton({ text, rows = 4 }: { text: string; rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="py-4">
      <p className="mb-4 text-sm text-ink-muted">{text}</p>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i === rows - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  )
}

/** Solver solution panel while the answer is being generated. */
export function SolutionSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Solving your question">
      <p className="mb-5 text-sm font-medium text-ink">Solving your question...</p>
      <Skeleton className="h-5 w-48" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
      </div>
      <Skeleton className="mt-7 h-5 w-56" />
      <div className="mt-3 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Sidebar course list while courses load. */
export function SidebarCoursesSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading courses" className="space-y-2 py-2 pl-9 pr-3">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function PapersSkeleton() {
  return (
    <Region label="Loading past papers" className={shell}>
      <PageHeader />
      <div className="mt-8 flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="hidden h-11 w-40 rounded-lg sm:block" />
        <Skeleton className="hidden h-11 w-40 rounded-lg sm:block" />
      </div>
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className={`${panel} mt-6 p-6`}>
          <Skeleton className="h-6 w-40" />
          <div className="mt-4 divide-y divide-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Region>
  )
}
