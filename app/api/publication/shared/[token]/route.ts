import { NextRequest, NextResponse } from "next/server"

import { resolvePublicationShareAccess } from "@/lib/admin/publication-share-links.service"

export const dynamic = "force-dynamic"

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  )
}

/**
 * PUB-206 — Resolve a hashed share token (public).
 * Passcode via body or `x-share-passcode` header. Never caches.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({}))
    const action = body?.action === "download" ? "download" : "view"
    const passcode =
      (typeof body?.passcode === "string" ? body.passcode : null) ||
      request.headers.get("x-share-passcode")
    const requestedScopeKeys = Array.isArray(body?.sections)
      ? body.sections.map(String)
      : undefined

    const result = await resolvePublicationShareAccess({
      token,
      action,
      passcode,
      requestedScopeKeys,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
      correlationId: request.headers.get("x-correlation-id"),
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.reason, code: result.reason },
        {
          status: result.status,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            Pragma: "no-cache",
          },
        },
      )
    }

    return NextResponse.json(
      {
        success: true,
        share: result.share,
        publication: result.publication,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          Pragma: "no-cache",
          "Referrer-Policy": "no-referrer",
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Share access failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  // GET without passcode support is view-only probe for links that need no passcode.
  const { token } = await context.params
  const result = await resolvePublicationShareAccess({
    token,
    action: "view",
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent"),
    correlationId: request.headers.get("x-correlation-id"),
  })

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.reason, code: result.reason },
      {
        status: result.status,
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      },
    )
  }

  return NextResponse.json(
    { success: true, share: result.share, publication: result.publication },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        "Referrer-Policy": "no-referrer",
      },
    },
  )
}
