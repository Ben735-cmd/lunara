import { supabase } from "./supabase"

const SIZE = 320

// Centre-crops the photo to a square and shrinks it, so a 6 MB phone photo
// becomes a file of a few dozen KB.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = Math.min(SIZE, side)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not process the picture.")
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the picture."))), "image/jpeg", 0.85)
  )
}

/** Uploads a profile picture to the student's own folder and returns its public link. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const blob = await toSquareJpeg(file)
  const path = `${userId}/avatar.jpg`
  const { error } = await supabase.storage.from("avatars").upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from("avatars").getPublicUrl(path)
  // The file name never changes, so add a version to make browsers load the new picture.
  return `${data.publicUrl}?v=${Date.now()}`
}
