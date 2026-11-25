"use client"

import AIChat from "./AIChat"
import PageHeader from "../ui/PageHeader"

/** The study assistant on its own tab. */
export default function AssistantScreen() {
  return (
    <section className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-5 pb-32 pt-8 md:px-12 md:pb-36 md:pt-11">
      <PageHeader title="Assistant" subtitle="Ask a question about anything you are studying." />
      <div className="mt-6 rounded-xl border border-line bg-surface p-5 md:p-6">
        <AIChat />
      </div>
    </section>
  )
}
