import { env } from "@/lib/config/env"
import { supabase } from "@/lib/supabase"

export type PortfolioUploadKind = "image" | "video" | "audio" | "file"

export async function uploadPortfolioFile(params: {
  uri: string
  name: string
  mimeType: string
  kind?: PortfolioUploadKind
  /** @deprecated Use `kind` — mapped for backward compatibility */
  portfolioType?: "photo" | "music"
  tosAccepted: boolean
}) {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error("You must be signed in to upload files")
  if (!params.tosAccepted) throw new Error("You must accept the terms to upload")

  const kind =
    params.kind ||
    (params.portfolioType === "music" ? "audio" : params.portfolioType === "photo" ? "image" : "image")

  const formData = new FormData()
  formData.append("kind", kind)
  formData.append("tos", "accepted")
  formData.append("file", {
    uri: params.uri,
    name: params.name,
    type: params.mimeType
  } as unknown as Blob)

  const response = await fetch(`${env.apiBaseUrl}/api/portfolio/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: formData
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || "Upload failed")
  }

  return response.json()
}
