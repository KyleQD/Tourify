import { NextRequest, NextResponse } from "next/server"
import { POST as createPost } from "@/app/api/posts/create/route"

export const dynamic = "force-dynamic"

/**
 * Compatibility alias for offline service-worker sync and legacy clients.
 * Delegates to /api/posts/create.
 */
export async function POST(request: NextRequest) {
  return createPost(request)
}
