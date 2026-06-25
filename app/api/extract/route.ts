import { NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"
import { extractText } from "unpdf"

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

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File

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
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })
      return NextResponse.json({ text: formatExtractedText(text) })
    }

    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  } catch (err: any) {
    console.error("Extract error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}