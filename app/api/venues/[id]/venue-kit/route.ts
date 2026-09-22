import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/venues/[id]/venue-kit
 * Returns the public Venue Kit metadata for a venue profile.
 * Used by the public venue profile page to show the Kit CTA banner
 * and press mentions.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("venue_kit_settings" as any)
      .select("vk_slug, is_public, settings")
      .eq("venue_profile_id", id)
      .eq("is_public", true)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ vk_slug: null, press: [] })
    }

    const row = data as {
      vk_slug?: string | null
      is_public?: boolean
      settings?: Record<string, unknown>
    }

    const press = Array.isArray(row.settings?.press) ? row.settings.press : []

    return NextResponse.json({
      vk_slug: row.vk_slug ?? null,
      is_public: row.is_public ?? false,
      press,
    })
  } catch (err) {
    console.error("[venue-kit] GET error", err)
    return NextResponse.json({ vk_slug: null, press: [] })
  }
}
