import { NextResponse } from "next/server"
import { buildTdmReservationDocument } from "@/lib/music-rights/training-reservation"

export const dynamic = "force-dynamic"

export async function GET() {
  const document = buildTdmReservationDocument()
  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/json",
    },
  })
}
