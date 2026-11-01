import { RefreshCw, WifiOff, TriangleAlert } from "lucide-react"

/** A friendly "could not load" block with a retry button, used in place of a blank or empty screen. */
export default function ErrorState({
  title = "We couldn't load this",
  message,
  offline = false,
  onRetry,
}: {
  title?: string
  message?: string
  offline?: boolean
  onRetry?: () => void
}) {
  const Icon = offline ? WifiOff : TriangleAlert
  return (
    <div role="alert" className="mt-8 rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-tint text-danger">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="mt-4 font-medium text-ink">{offline ? "You're offline" : title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-muted">
        {message ?? (offline ? "Connect to the internet and try again." : "Check your connection and try again. If it keeps happening, it's on us, and we'll look into it.")}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong"
        >
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  )
}
