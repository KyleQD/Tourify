import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser, jsonError } from "@/lib/api/route-helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(240),
  contentType: z.string().min(1).max(120),
  kind: z.enum(["full", "preview", "cover"]),
})

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-160)
}

function extensionFor(kind: "full" | "preview" | "cover", fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase()
  if (ext && /^[a-z0-9]{2,8}$/.test(ext)) return ext
  return kind === "cover" ? "jpg" : "mp3"
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user } = authResult.auth

    const payload = uploadUrlSchema.parse(await request.json())
    const isAudio = payload.contentType.startsWith("audio/")
    const isImage = payload.contentType.startsWith("image/")
    if (payload.kind === "cover" ? !isImage : !isAudio) {
      return jsonError({
        status: 400,
        code: "invalid_upload_type",
        message: payload.kind === "cover" ? "Cover uploads must be images." : "Music uploads must be audio files.",
        retryable: false,
      })
    }

    const bucket = payload.kind === "cover" ? "artist-photos" : "artist-music"
    const ext = extensionFor(payload.kind, payload.fileName)
    const safeName = sanitizeFileName(payload.fileName.replace(/\.[^.]+$/, ""))
    const path = `${user.id}/${payload.kind}/${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`

    const service = createServiceRoleClient()
    const { data, error } = await service.storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (error || !data?.signedUrl || !data?.token) {
      console.error("Failed to create music signed upload URL", error)
      return jsonError({
        status: 500,
        code: "signed_upload_url_failed",
        message: "Unable to prepare upload.",
        retryable: true,
      })
    }

    return NextResponse.json({
      data: {
        bucket,
        path,
        token: data.token,
        signedUrl: data.signedUrl,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid upload request", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected music upload-url error", error)
    return jsonError({
      status: 500,
      code: "music_upload_url_internal",
      message: "Unexpected upload preparation error.",
      retryable: true,
    })
  }
}

