import { supabase } from "./supabase"

const BUCKET = "course-images"

/** The course text without picture markers or page breaks, for the AI prompts. */
export function plainContent(content: string): string {
  return content.replace(/\[\[img:[^\]]+\]\]/g, " ").replace(/\f/g, "\n\n")
}

/** Paths of the pictures a piece of structured Markdown refers to. */
export function imagePaths(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(/\]\(img:([^)\s]+)\)/g)].map((m) => m[1]))]
}

/**
 * Swaps the img:<path> placeholders for short-lived signed links. A picture
 * that can't be loaded is dropped rather than shown broken.
 */
export async function resolveImages(markdown: string): Promise<string> {
  const paths = imagePaths(markdown)
  if (!paths.length) return markdown
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60)
  const urls = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  return markdown.replace(/!\[([^\]]*)\]\(img:([^)\s]+)\)/g, (_m, alt: string, path: string) => {
    const url = urls.get(path)
    return url ? `![${alt}](${url})` : ""
  })
}

/** Removes every picture saved for a course. Best effort: a failure never blocks deleting the course. */
export async function deleteCourseImages(userId: string, courseId: string) {
  try {
    const folder = `${userId}/${courseId}`
    const { data } = await supabase.storage.from(BUCKET).list(folder, { limit: 200 })
    if (data?.length) await supabase.storage.from(BUCKET).remove(data.map((f) => `${folder}/${f.name}`))
  } catch {
    // leftover files are harmless
  }
}
