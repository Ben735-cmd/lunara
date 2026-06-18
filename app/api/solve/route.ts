import { NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"
import { extractText } from "unpdf"

async function solveWithGroq(questionText: string): Promise<string> {
  const Groq = (await import("groq-sdk")).default
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are an expert tutor and problem solver. When given a question or problem:
1. Analyze what is being asked
2. Provide a clear step-by-step solution
3. State the final answer clearly at the end

Format your response as:
## Understanding the Problem
[brief explanation of what's being asked]

## Step-by-Step Solution
[numbered steps]

## Final Answer
[clear final answer]`,
      },
      {
        role: "user",
        content: `Please solve this:\n\n${questionText}`,
      },
    ],
    max_tokens: 2048,
  })

  return completion.choices[0]?.message?.content || "Could not generate solution."
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
    let questionText = ""

    // Handle PDF
    if (file.name.endsWith(".pdf")) {
      const { extractText } = await import("unpdf")
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })
      questionText = text
    }

    // Handle Word
    else if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer })
      questionText = result.value
    }

    // Handle images
    else if (file.type.startsWith("image/")) {
      const base64 = buffer.toString("base64")
      const mimeType = file.type

      // Use Groq vision model for images
      const Groq = (await import("groq-sdk")).default
      const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

      const completion = await client.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              {
                type: "text",
                text: `Please solve the question(s) in this image. Provide:
1. A clear step-by-step solution
2. The final answer

Format as:
## Understanding the Problem
[what's being asked]

## Step-by-Step Solution
[numbered steps]

## Final Answer
[clear final answer]`,
              },
            ],
          },
        ],
        max_tokens: 2048,
      })

      const solution = completion.choices[0]?.message?.content || "Could not read image."
      return NextResponse.json({ solution })
    }

    else {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, or an image." }, { status: 400 })
    }

    if (!questionText.trim()) {
      return NextResponse.json({ error: "Could not extract text from file." }, { status: 400 })
    }

    const solution = await solveWithGroq(questionText)
    return NextResponse.json({ solution, extractedText: questionText })

  } catch (err: any) {
    console.error("Solve error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}