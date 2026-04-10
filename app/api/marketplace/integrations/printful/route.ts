import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { syncPrintfulCatalog } from "@/lib/marketplace/printful-adapter"

const connectSchema = z.object({
  accessToken: z.string().min(8),
  externalAccountId: z.string().min(2).optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("marketplace_integrations")
      .select("*")
      .eq("seller_user_id", user.id)
      .eq("provider", "printful")
      .maybeSingle()

    if (error) {
      console.error("Failed to fetch Printful integration", error)
      return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected Printful integration GET error", error)
    return NextResponse.json({ error: "Unexpected integration error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = connectSchema.parse(await request.json())
    const { data: row, error } = await supabase
      .from("marketplace_integrations")
      .upsert(
        {
          seller_user_id: user.id,
          provider: "printful",
          external_account_id: payload.externalAccountId || null,
          access_token: payload.accessToken,
          settings: payload.settings || {},
          status: "active",
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "seller_user_id,provider" }
      )
      .select("*")
      .single()

    if (error) {
      console.error("Failed to save Printful integration", error)
      return NextResponse.json({ error: "Failed to save integration" }, { status: 500 })
    }

    const syncResult = await syncPrintfulCatalog({ accessToken: payload.accessToken })
    return NextResponse.json({ data: row, sync: syncResult })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid integration payload", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected Printful integration POST error", error)
    return NextResponse.json({ error: "Unexpected integration error" }, { status: 500 })
  }
}
