import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useSession } from "@/hooks/use-session"

interface VenueProfileSummary {
  id: string
  venue_name: string
  city?: string | null
  state?: string | null
}

interface AccountModeState {
  isLoading: boolean
  accountType: "venue" | "artist" | "general"
  isVenueMode: boolean
  venueProfile: VenueProfileSummary | null
}

export function useAccountMode(): AccountModeState {
  const { user } = useSession()
  const [state, setState] = useState<AccountModeState>({
    isLoading: true,
    accountType: "general",
    isVenueMode: false,
    venueProfile: null,
  })

  useEffect(() => {
    async function loadAccountMode() {
      if (!user?.id) {
        setState({
          isLoading: false,
          accountType: "general",
          isVenueMode: false,
          venueProfile: null,
        })
        return
      }

      try {
        const [{ data: profile }, { data: venueProfile }] = await Promise.all([
          supabase
            .from("profiles")
            .select("account_type")
            .or(`user_id.eq.${user.id},id.eq.${user.id}`)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("venue_profiles")
            .select("id, venue_name, city, state")
            .or(`user_id.eq.${user.id},main_profile_id.eq.${user.id}`)
            .limit(1)
            .maybeSingle(),
        ])

        const accountType =
          profile?.account_type === "venue" || venueProfile
            ? "venue"
            : profile?.account_type === "artist"
              ? "artist"
              : "general"

        setState({
          isLoading: false,
          accountType,
          isVenueMode: accountType === "venue",
          venueProfile: venueProfile
            ? {
                id: venueProfile.id,
                venue_name: venueProfile.venue_name,
                city: venueProfile.city,
                state: venueProfile.state,
              }
            : null,
        })
      } catch {
        setState({
          isLoading: false,
          accountType: "general",
          isVenueMode: false,
          venueProfile: null,
        })
      }
    }

    void loadAccountMode()
  }, [user?.id])

  return state
}
