import Groq from "groq-sdk"

type Messages = Groq.Chat.Completions.ChatCompletionMessageParam[]

// Groq retires models from time to time (llama-3.3-70b-versatile and the Llama 4
// vision model were shut down in 2026). Each list is tried in order, and a model
// that no longer exists is skipped automatically. To switch models without a code
// change, set GROQ_TEXT_MODELS or GROQ_VISION_MODELS in Vercel
// (comma separated, best first).
const TEXT_MODELS = parseList(process.env.GROQ_TEXT_MODELS, ["openai/gpt-oss-120b", "qwen/qwen3.6-27b"])
const VISION_MODELS = parseList(process.env.GROQ_VISION_MODELS, ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"])

function parseList(value: string | undefined, fallback: string[]) {
  const list = (value ?? "").split(",").map((m) => m.trim()).filter(Boolean)
  return list.length ? list : fallback
}

// These are reasoning models. Keep thinking short so answers come back fast
// and the reasoning text does not end up in the reply.
function modelOptions(model: string): { reasoning_effort?: "none" | "low" } {
  if (model.startsWith("qwen/")) return { reasoning_effort: "none" }
  if (model.startsWith("openai/gpt-oss")) return { reasoning_effort: "low" }
  return {}
}

function shouldTryNextModel(err: unknown) {
  const status = (err as { status?: number })?.status
  // Model missing (404), model rejected the request (400), rate limited (429) or Groq-side error.
  return status === 404 || status === 400 || status === 429 || (typeof status === "number" && status >= 500)
}

async function chat(models: string[], messages: Messages, maxTokens: number): Promise<string> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  let lastError: unknown

  for (const model of models) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        ...modelOptions(model),
      })

      const text = completion.choices[0]?.message?.content ?? ""
      // Some reasoning models wrap their thinking in <think> tags. Never show it.
      const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
      if (cleaned) return cleaned
      lastError = new Error(`Empty response from ${model}`)
    } catch (err) {
      lastError = err
      console.error(`Groq model ${model} failed:`, (err as Error)?.message ?? err)
      if (!shouldTryNextModel(err)) throw err
    }
  }
  throw lastError
}

export function askText(messages: Messages, maxTokens = 4096) {
  return chat(TEXT_MODELS, messages, maxTokens)
}

export function askVision(messages: Messages, maxTokens = 4096) {
  return chat(VISION_MODELS, messages, maxTokens)
}
