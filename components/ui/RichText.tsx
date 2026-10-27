"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

// Renders AI answers: Markdown (headings, bold, lists, tables) plus LaTeX maths
// written as $...$ (inline) or $$...$$ (own line).

function normalize(text: string) {
  return (
    text
      // \( ... \) and \[ ... \] are also common maths delimiters
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`)
      // A $$ ... $$ that sits alone on one line becomes a centred block
      .replace(/^[ \t]*\$\$([^\n]+?)\$\$[ \t]*$/gm, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
  )
}

export default function RichText({ children }: { children: string }) {
  return (
    <div className="rich-text text-sm leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: (p) => <h3 className="mb-2 mt-6 text-lg font-semibold text-ink first:mt-0" {...p} />,
          h2: (p) => <h3 className="mb-2 mt-6 text-base font-semibold text-ink first:mt-0" {...p} />,
          h3: (p) => <h4 className="mb-1.5 mt-5 text-sm font-semibold text-ink first:mt-0" {...p} />,
          h4: (p) => <h4 className="mb-1.5 mt-4 text-sm font-semibold text-ink" {...p} />,
          p: (p) => <p className="my-2.5" {...p} />,
          strong: (p) => <strong className="font-semibold text-ink" {...p} />,
          ol: (p) => <ol className="my-3 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-accent-strong" {...p} />,
          ul: (p) => <ul className="my-3 list-disc space-y-1.5 pl-6 marker:text-accent" {...p} />,
          li: (p) => <li className="pl-1" {...p} />,
          hr: () => <hr className="my-5 border-line" />,
          blockquote: (p) => <blockquote className="my-3 border-l-2 border-accent pl-4 text-ink-muted" {...p} />,
          code: (p) => <code className="rounded bg-paper px-1.5 py-0.5 text-[0.85em]" {...p} />,
          pre: (p) => <pre className="my-3 overflow-x-auto rounded-lg bg-paper p-3 text-xs" {...p} />,
          table: (p) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="border border-line bg-paper px-3 py-1.5 font-semibold" {...p} />,
          td: (p) => <td className="border border-line px-3 py-1.5" {...p} />,
          a: (p) => <a className="text-accent-strong underline" target="_blank" rel="noopener noreferrer" {...p} />,
        }}
      >
        {normalize(children)}
      </ReactMarkdown>
    </div>
  )
}
