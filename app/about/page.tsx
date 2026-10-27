import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import LegalPage, { Section } from "../../components/ui/LegalPage"

export const metadata: Metadata = {
  title: "About - Lunara",
  description: "Lunara is a student dashboard built by Ben Lubona, a computer science student at Copperbelt University.",
}

export default function AboutPage() {
  return (
    <LegalPage
      title="About Lunara"
      intro="Lunara keeps a student's courses, notes, assignments and deadlines in one place, and turns study material into summaries, quizzes and flashcards."
    >
      <Section title="Why it exists">
        <p>Lunara started as a side project to make studying less scattered. Instead of juggling notes apps, calendars and PDFs, you keep everything for the semester together and let the AI help when you get stuck.</p>
      </Section>

      <Section title="The creator">
        <p><strong>Ben Lubona</strong> is a second-year Computer Science student at Copperbelt University. He builds Lunara on his own, and is interested in software development and cybersecurity and governance, risk and compliance (GRC).</p>
        <p>
          Email: <a href="mailto:benlubona735@gmail.com">benlubona735@gmail.com</a>
        </p>
        <p>
          <a
            href="https://github.com/Ben735-cmd"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            GitHub profile <ExternalLink size={14} aria-hidden="true" />
          </a>
        </p>
      </Section>

      <Section title="Built with">
        <p>Next.js, React, TypeScript, Tailwind CSS, Supabase and Groq, hosted on Vercel. The source code is open under the MIT license at <a href="https://github.com/Ben735-cmd/lunara" rel="noopener noreferrer">github.com/Ben735-cmd/lunara</a>.</p>
      </Section>

      <Section title="Feedback">
        <p>Found a bug or have an idea? Open an issue on <a href="https://github.com/Ben735-cmd/lunara/issues" rel="noopener noreferrer">GitHub</a>. To see how your data is handled, read the <Link href="/privacy">privacy policy</Link>.</p>
      </Section>
    </LegalPage>
  )
}
