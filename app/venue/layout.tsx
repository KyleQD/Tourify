import type React from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { VenueProviders } from "./providers"
import { VenueRootChromeOffset } from "./components/venue-root-chrome-offset"
import { Toaster } from "@/components/ui/toaster"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Tourify - Music Industry Platform",
  description: "Connect, collaborate, and grow in the music industry",
    generator: 'v0.dev'
}

async function hasVenueAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false, reason: "unauthenticated" as const }

  const [{ data: venueRows }, { data: accountProfile }] = await Promise.all([
    supabase
      .from("venue_profiles")
      .select("id")
      .or(`user_id.eq.${user.id},main_profile_id.eq.${user.id}`)
      .limit(1),
    supabase
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle(),
  ])

  const venueProfile = venueRows?.[0]

  if (venueProfile?.id) return { allowed: true as const }
  if (accountProfile?.account_type === "venue") return { allowed: true as const }
  return { allowed: false, reason: "forbidden" as const }
}

export default async function VenueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const access = await hasVenueAccess()
  if (!access.allowed) {
    if (access.reason === "unauthenticated")
      redirect("/login?redirectTo=%2Fvenue")
    redirect("/dashboard?error=venue-account-required")
  }

  return (
    <VenueProviders>
      <VenueRootChromeOffset>{children}</VenueRootChromeOffset>
      <Toaster />
    </VenueProviders>
  )
}
