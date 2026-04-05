import { env } from "@/lib/config/env"
import { supabase } from "@/lib/supabase/client"

export async function uploadPortfolioFile(params: {
  uri: string
  name: string
  mimeType: string
  portfolioType?: "photo" | "music"
}) {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error("You must be signed in to upload files")

  const formData = new FormData()
  formData.append("portfolioType", params.portfolioType || "photo")
  formData.append("file", {
    uri: params.uri,
    name: params.name,
    type: params.mimeType
  } as any)

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
