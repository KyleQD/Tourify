import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const quoteSchema = z.object({
  subtotal: z.number().min(0),
  country: z.string().length(2).optional(),
  state: z.string().max(80).optional(),
})

export const dynamic = "force-dynamic"

/**
 * Placeholder tax quote endpoint.
 * This centralizes tax logic now so Stripe Tax or third-party providers can be added without API churn.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = quoteSchema.parse(await request.json())
    const normalizedCountry = (payload.country || "US").toUpperCase()
    const normalizedState = (payload.state || "").toUpperCase()

    let rate = 0
    if (normalizedCountry === "US") {
      if (normalizedState === "CA") rate = 0.0725
      if (normalizedState === "NY") rate = 0.04
      if (normalizedState === "TX") rate = 0.0625
    }

    const taxAmount = Math.round(payload.subtotal * rate * 100) / 100
    return NextResponse.json({
      data: {
        rate,
        taxAmount,
        provider: "internal-placeholder",
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid tax quote payload", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected tax quote error", error)
    return NextResponse.json({ error: "Unexpected tax quote error" }, { status: 500 })
  }
}
