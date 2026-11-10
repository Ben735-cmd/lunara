// fetch() cannot report how much of an upload has been sent, XMLHttpRequest can.
// This sends a form and reports progress, and gives up only when the upload stalls
// (no bytes moving) or the server takes too long to answer, not just because the file is big.

export type UploadResult = { ok: boolean; status: number; data: unknown }

export function postWithProgress(
  url: string,
  body: FormData,
  options: {
    headers?: Record<string, string>
    signal?: AbortSignal
    /** Called with 0 to 1 as bytes are sent. */
    onProgress?: (fraction: number) => void
    /** Called once every byte has been sent and the server is working on it. */
    onSent?: () => void
    stallMs?: number
    replyMs?: number
  } = {}
): Promise<UploadResult> {
  const { headers, signal, onProgress, onSent, stallMs = 30_000, replyMs = 60_000 } = options
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = (ms: number, reason: string) => {
      clearTimeout(timer)
      timer = setTimeout(() => { xhr.abort(); reject(new Error(reason)) }, ms)
    }
    const done = () => { clearTimeout(timer); signal?.removeEventListener("abort", onAbort) }
    const onAbort = () => { xhr.abort(); done(); reject(new DOMException("Aborted", "AbortError")) }

    if (signal?.aborted) { onAbort(); return }
    signal?.addEventListener("abort", onAbort)

    xhr.open("POST", url)
    for (const [key, value] of Object.entries(headers ?? {})) xhr.setRequestHeader(key, value)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
      arm(stallMs, "stalled")
    }
    xhr.upload.onload = () => {
      onProgress?.(1)
      onSent?.()
      arm(replyMs, "no-reply")
    }
    xhr.onload = () => {
      done()
      let data: unknown = null
      try { data = JSON.parse(xhr.responseText) } catch { /* not JSON */ }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data })
    }
    xhr.onerror = () => { done(); reject(new Error("network")) }
    arm(stallMs, "stalled")
    xhr.send(body)
  })
}
