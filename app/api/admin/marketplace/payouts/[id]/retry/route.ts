import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const { data: payout, error: payoutError } = await supabase
      .from("marketplace_payout_ledger")
      .select("id, payout_status, metadata")
      .eq("id", id)
      .single()

    if (payoutError || !payout) return NextResponse.json({ error: "Payout row not found" }, { status: 404 })
    if (!["on_hold", "failed", "pending"].includes(payout.payout_status)) {
      return NextResponse.json({ error: "Payout is not eligible for retry" }, { status: 400 })
    }

    const metadata = payout.metadata && typeof payout.metadata === "object" ? (payout.metadata as Record<string, unknown>) : {}
    const retryAttempts = Number(metadata.retryAttempts || 0) + 1

    const { data: updated, error: updateError } = await supabase
      .from("marketplace_payout_ledger")
      .update({
        payout_status: "scheduled",
        available_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          ...metadata,
          retryAttempts,
          lastRetryBy: user.id,
          lastRetryAt: new Date().toISOString(),
        },
      })
      .eq("id", id)
      .select("*")
      .single()

    if (updateError || !updated) {
      console.error("Failed to retry marketplace payout", updateError)
      return NextResponse.json({ error: "Failed to retry payout scheduling" }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("Unexpected retry payout error", error)
    return NextResponse.json({ error: "Unexpected retry payout error" }, { status: 500 })
  }
}
