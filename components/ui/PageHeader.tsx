import type { ReactNode } from "react"

/**
 * The top of every dashboard page: the title and a one-line description on the left,
 * the page's main action on the right. The action stays beside the title on phones too.
 */
export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </div>
  )
}
