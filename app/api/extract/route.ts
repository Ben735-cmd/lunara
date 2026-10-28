import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import mammoth from "mammoth"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import { extractImages, extractText, getDocumentProxy } from "unpdf"

// Reading a long PDF and saving its pictures can take a while.
export const maxDuration = 60

const BUCKET = "course-images"
const MIN_WIDTH = 160 // smaller pictures are icons and bullets, not figures
const MIN_HEIGHT = 100
const MAX_PER_PAGE = 4
const MAX_TOTAL = 40
const TIME_BUDGET_MS = 40_000
// A picture that shows up on this many pages is a logo or a background, not content.
const REPEAT_LIMIT = 3

function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, "")
}

function formatExtractedText(raw: string): string {
  return sanitizeText(raw)
    .replace(/(\s)(\d+)\.\s+/g, "\n\n$2. ")
    .replace(/(\s)(Chapter|Section|Unit|Topic|Part)\s+/gi, "\n\n$2 ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

type Picture = { page: number; hash: string; jpeg: Buffer }

// Pulls the embedded pictures out of each page and turns them into web-sized JPEGs.
async function collectPictures(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, pageCount: number): Promise<Picture[]> {
  const started = Date.now()
  const found: Picture[] = []
  const seen = new Map<string, number>()

  for (let page = 1; page <= pageCount; page++) {
    if (Date.now() - started > TIME_BUDGET_MS) break
    let images
    try {
      images = await extractImages(pdf, page)
    } catch {
      continue
    }
    let onPage = 0
    for (const img of images) {
      if (onPage >= MAX_PER_PAGE) break
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) continue
      const hash = createHash("sha1")
        .update(Buffer.from(img.data.buffer, img.data.byteOffset, Math.min(img.data.byteLength, 8192)))
        .update(`${img.width}x${img.height}`)
        .digest("hex")
      seen.set(hash, (seen.get(hash) ?? 0) + 1)
      try {
        const jpeg = await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), {
          raw: { width: img.width, height: img.height, channels: img.channels },
        })
          .flatten({ background: "#ffffff" })
          .resize({ width: 1000, withoutEnlargement: true })
          .jpeg({ quality: 78 })
          .toBuffer()
        found.push({ page, hash, jpeg })
        onPage++
      } catch {
        // an image format sharp can't read: skip it
      }
    }
  }

  return found.filter((p) => (seen.get(p.hash) ?? 0) < REPEAT_LIMIT).slice(0, MAX_TOTAL)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File
  const courseId = String(formData.get("courseId") ?? "")

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer })
      return NextResponse.json({ text: formatExtractedText(result.value) })
    }

    if (file.name.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      // Keep page (slide) boundaries: a form feed between pages lets the course
      // viewer turn each slide into its own heading and list.
      const { text } = await extractText(pdf, { mergePages: false })
      const pages = text.map(formatExtractedText)

      // Pictures are saved to the signed-in student's own folder. Without a
      // valid sign-in or course id the text still comes back.
      let imagesByPage = new Map<number, string[]>()
      const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (token && url && anon && /^[0-9a-f-]{36}$/i.test(courseId)) {
        try {
          const supabase = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } })
          const { data: userData } = await supabase.auth.getUser(token)
          const userId = userData.user?.id
          if (userId) {
            const pictures = await collectPictures(pdf, pages.length)
            const counters = new Map<number, number>()
            const uploads = pictures.map(async (pic) => {
              const n = (counters.get(pic.page) ?? 0) + 1
              counters.set(pic.page, n)
              const path = `${userId}/${courseId}/p${pic.page}-${n}.jpg`
              const { error } = await supabase.storage.from(BUCKET).upload(path, pic.jpeg, {
                contentType: "image/jpeg",
                upsert: true,
              })
              if (!error) {
                const list = imagesByPage.get(pic.page) ?? []
                list.push(path)
                imagesByPage.set(pic.page, list)
              }
            })
            await Promise.all(uploads)
          }
        } catch (err) {
          console.error("Picture extraction failed:", err instanceof Error ? err.message : err)
          imagesByPage = new Map()
        }
      }

      const withMarkers = pages.map((p, i) => {
        const paths = (imagesByPage.get(i + 1) ?? []).sort()
        return paths.length ? `${p}\n${paths.map((x) => `[[img:${x}]]`).join("\n")}` : p
      })
      const imageCount = [...imagesByPage.values()].reduce((n, l) => n + l.length, 0)
      return NextResponse.json({ text: withMarkers.filter(Boolean).join("\f"), imageCount })
    }

    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read this file."
    console.error("Extract error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
