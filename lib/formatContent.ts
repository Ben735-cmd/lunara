// Turns the flat text pulled out of a PDF or Word file into readable Markdown:
// slide titles become headings, bullets become real (nested) lists, and the
// repeating footer and slide numbers are dropped. It works on text that is
// already stored, so old courses improve without being uploaded again.

const PAGE_BREAK = "\f"

// PowerPoint exports bullets as private-use glyphs (they show as empty boxes).
// U+F0B2 is the first-level bullet and U+F0A7 the second level in the decks we
// have seen; any other bullet-like symbol is treated as first level.
const SUB_BULLET = ""
const BULLET_CHARS = "•●▪■□◆◦‣"
const BULLET_RE = new RegExp(`\\s*([${BULLET_CHARS}]|[\\ue000-\\uf8ff])\\s*`, "g")
const BULLET_SPLIT = new RegExp(`\\s*[${BULLET_CHARS}\\ue000-\\uf8ff]\\s*`)

function escapeMd(text: string) {
  return text
    .replace(/[\\*_`$<>|]/g, (c) => `\\${c}`)
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/^#/g, "\\#")
}

// Slide decks repeat a footer such as "Chapter 9 Software evolution" with the
// slide number stuck to the front ("12Chapter 9 Software evolution"). Find it
// by looking for a word that follows a number many times, then keep the words
// that are the same every time.
function findFooter(text: string): string | null {
  const re = /(\d{1,3})([A-Z][A-Za-z]*(?: [A-Za-z0-9–-]+){1,7})/g
  const groups = new Map<string, string[][]>()
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const words = m[2].split(" ")
    const list = groups.get(words[0]) ?? []
    list.push(words)
    groups.set(words[0], list)
  }
  let best: { footer: string; count: number } | null = null
  for (const [, list] of groups) {
    if (list.length < 4) continue
    let common = list[0]
    for (const words of list.slice(1)) {
      let i = 0
      while (i < common.length && i < words.length && common[i] === words[i]) i++
      common = common.slice(0, i)
    }
    if (common.length >= 2 && (!best || list.length > best.count)) {
      best = { footer: common.join(" "), count: list.length }
    }
  }
  return best ? best.footer : null
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

type Bullet = { level: 0 | 1; text: string }

// Splits "Title ■ one ▪ two" into the title and its bullet items.
function splitBullets(chunk: string): { head: string; bullets: Bullet[] } {
  const first = chunk.search(BULLET_SPLIT)
  if (first === -1) return { head: chunk.trim(), bullets: [] }
  const head = chunk.slice(0, first).trim()
  const bullets: Bullet[] = []
  const rest = chunk.slice(first)
  const parts = rest.split(BULLET_RE)
  // split() with a capture group alternates: text, bullet char, text, ...
  for (let i = 1; i < parts.length; i += 2) {
    const text = (parts[i + 1] ?? "").trim()
    if (text) bullets.push({ level: parts[i] === SUB_BULLET ? 1 : 0, text })
  }
  return { head, bullets }
}

function paragraphs(text: string, size = 420): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const out: string[] = []
  let current = ""
  for (const s of sentences) {
    current += (current ? " " : "") + s
    if (current.length > size) {
      out.push(current)
      current = ""
    }
  }
  if (current.trim()) out.push(current)
  return out
}

function renderChunk(chunk: string, isFirst: boolean): string {
  const clean = chunk.replace(/\s+/g, " ").trim()
  if (!clean) return ""
  const { head, bullets } = splitBullets(clean)
  const lines: string[] = []

  if (bullets.length) {
    if (head && head.length <= 120) lines.push(`${isFirst ? "#" : "##"} ${escapeMd(head)}`)
    else if (head) lines.push(...paragraphs(escapeMd(head)))
    lines.push(
      bullets
        .map((b) => `${b.level ? "  " : ""}- ${escapeMd(b.text)}`)
        .join("\n")
    )
  } else if (clean.length <= 100) {
    lines.push(`${isFirst ? "#" : "##"} ${escapeMd(clean)}`)
  } else {
    lines.push(...paragraphs(escapeMd(clean)))
  }
  return lines.join("\n\n")
}

// Ordinary documents (no slide footer): break into paragraphs, and put numbered
// sections such as "1.2.1 Course objectives" and "(1) ..." items on their own lines.
function renderProse(text: string): string {
  // Escape first, so the Markdown markers we add below stay intact.
  const body = escapeMd(text)
    .replace(BULLET_RE, "\n- ")
    .replace(/(?<!\]:)\s((?:[1-9]|1\d|20)(?:\.[1-9]\d?){1,3})\s+(?=[A-Z])/g, "\n\n**$1** ")
    .replace(/\s\((\d{1,2})\)\s+(?=[A-Z])/g, "\n\n($1) ")
  return body
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ""
      if (trimmed.startsWith("- ")) {
        return trimmed.split("\n").map((l) => `- ${l.replace(/^-\s*/, "").trim()}`).join("\n")
      }
      return paragraphs(trimmed.replace(/\s+/g, " ")).join("\n\n")
    })
    .filter(Boolean)
    .join("\n\n")
}

export function structureContent(raw: string): string {
  const text = raw.replace(/\r/g, "").trim()
  if (!text) return ""

  const footer = findFooter(text.replace(new RegExp(PAGE_BREAK, "g"), " "))
  const hasBullets = BULLET_SPLIT.test(text)

  // Page-by-page text (new uploads): each page is one slide or section.
  if (text.includes(PAGE_BREAK)) {
    const footerRe = footer ? new RegExp(`\\d{0,3}\\s?${escapeRegExp(footer)}`, "g") : null
    const pages = text
      .split(PAGE_BREAK)
      .map((p) => (footerRe ? p.replace(footerRe, " ") : p).trim())
      .filter(Boolean)
    if (hasBullets || footer) {
      return pages.map((p, i) => renderChunk(p, i === 0)).filter(Boolean).join("\n\n")
    }
    return pages.map((p) => renderProse(p)).filter(Boolean).join("\n\n---\n\n")
  }

  // Slide deck stored as one block: cut it at every footer.
  if (footer && hasBullets) {
    const chunks = text.split(new RegExp(`\\s*\\d{1,3}\\s?${escapeRegExp(footer)}\\s*`))
    return chunks.map((c, i) => renderChunk(c, i === 0)).filter(Boolean).join("\n\n")
  }

  return renderProse(text)
}
