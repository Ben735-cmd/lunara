import { NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"
import { extractText } from "unpdf"

function formatExtractedText(raw: string): string {
  return raw
    // Add line break before numbered points like "1.", "2.", etc.
    .replace(/(\s)(\d+)\.\s+/g, "\n\n$2. ")
    // Add line break before "Chapter", "Section", "Unit" headings
    .replace(/(\s)(Chapter|Section|Unit|Topic|Part)\s+/gi, "\n\n$2 ")
    // Clean up excessive whitespace
    .replace(/[ \t]{2,}/g, " ")
    // Clean up more than 2 newlines
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