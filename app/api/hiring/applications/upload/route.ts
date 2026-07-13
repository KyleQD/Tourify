import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const BUCKET = "application-documents"
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

function buildDocumentDownloadUrl(path: string) {
  return `/api/hiring/applications/document?path=${encodeURIComponent(path)}`
}

/**
 * Uploads a single application document (resume, portfolio) to storage and
 * returns a durable descriptor the Quick Apply form persists into form_responses.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type. Upload a PDF, image, or Word document." },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "File too large. Maximum size is 10MB." }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    })

    if (uploadError) {
      console.error("[application upload]", uploadError)
      return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        url: buildDocumentDownloadUrl(path),
        path,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      },
    })
  } catch (error) {
    console.error("[application upload]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
