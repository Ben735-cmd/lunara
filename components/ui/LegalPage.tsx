import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import Logo from "./Logo"

// Shared frame for the public pages (privacy policy, about). These pages are
// readable without signing in, so they carry their own header and footer.
export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="Lunara home">
            <Logo size={32} />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-paper"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {intro && <p className="mt-3 leading-relaxed text-ink-muted">{intro}</p>}
        <div className="mt-8 space-y-8">{children}</div>
      </main>

      <footer className="border-t border-line bg-surface">
        <nav
          aria-label="Footer"
          className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-6 text-sm text-ink-muted"
        >
          <Link href="/about" className="hover:text-ink">About</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy policy</Link>
          <span className="sm:ml-auto">© 2026 Ben Lubona</span>
        </nav>
      </footer>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-ink-muted [&_a]:text-accent-strong [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-ink">
        {children}
      </div>
    </section>
  )
}
