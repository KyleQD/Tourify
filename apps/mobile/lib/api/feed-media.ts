import { supabase } from "@/lib/supabase"

const FEED_MEDIA_BUCKET = "post-media"

/**
 * Upload a locally-picked image to the shared `post-media` bucket and return its
 * public URL, matching the web feed-photo upload flow.
 */
export async function uploadFeedPhoto(params: {
  uri: string
  userId: string
  mimeType?: string
  name?: string
}): Promise<string> {
  const response = await fetch(params.uri)
  const blob = await response.blob()

  const extension = (params.name?.split(".").pop() || params.mimeType?.split("/").pop() || "jpg").toLowerCase()
  const fileName = `feed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`
  const path = `${params.userId}/${fileName}`

  const { data, error } = await supabase.storage.from(FEED_MEDIA_BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: params.mimeType || blob.type || "image/jpeg",
  })

  if (error || !data) {
    throw new Error(error?.message || "Photo upload failed")
  }

  const { data: publicUrl } = supabase.storage.from(FEED_MEDIA_BUCKET).getPublicUrl(data.path)
  return publicUrl.publicUrl
}
