import Link from "next/link"
import Logo from "../components/ui/Logo"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center text-ink">
      <Logo size={44} showName={false} className="mb-2" />
      <p className="text-sm font-medium text-accent-strong">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="max-w-sm text-sm text-ink-muted">The link may be old or mistyped. Let&apos;s get you back to studying.</p>
      <Link href="/" className="mt-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-strong">
        Back to Lunara
      </Link>
    </main>
  )
}
