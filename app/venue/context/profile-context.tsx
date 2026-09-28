"use client"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { normalizeAccountType } from "@/lib/accounts/account-types"
import { readAccountFromSearch } from "@/lib/navigation/account-context-url"
import { venueService } from "@/lib/services/venue.service"

interface ProfileContextType {
  profile: {
    id: string
    name: string
    avatar?: string
    type?: string
    description?: string
    bio?: string
    artistType?: string
    location?: string
    website?: string
    contactEmail?: string
    phone?: string
    capacity?: string
    theme?: string
    skills?: string[]
    gallery?: Array<{
      id: string
      url: string
      type: string
    }>
    experience?: Array<{
      title: string
      company: string
      duration: string
    }>
    certifications?: Array<{
      title: string
      organization: string
      year: string
    }>
    bookingSettings?: {
      leadTime: string
      autoApprove: string
      requireDeposit: boolean
      depositAmount: string
      cancellationPolicy: string
    }
    notifications?: {
      newBookings: boolean
      bookingUpdates: boolean
      messages: boolean
      marketing: boolean
    }
    team?: {
      members: any[]
      roles: any[]
    }
    payment?: {
      acceptedMethods: string[]
      taxRate: string
      currency: string
    }
  }
  createEPK: () => Promise<string>
  upgradeToPremiumEPK: () => Promise<boolean>
  // Add other context properties as needed
}

const ProfileContext = createContext<ProfileContextType>({
  profile: getDefaultProfile(),
  createEPK: async () => "",
  upgradeToPremiumEPK: async () => false,
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState(getDefaultProfile())
  const { currentAccount, accounts, isAccountsReady } = useMultiAccount()
  const searchParams = useSearchParams()

  // VEN-035/VEN-004: the sessionStorage hint is never authoritative on its own —
  // it is honored only when it matches an active venue account in the
  // server-seeded list; otherwise the context falls back to the RLS-validated
  // service lookup.
  const resolveVenueId = useCallback((): string | null => {
    if (currentAccount?.account_type === "venue" && currentAccount.profile_id) {
      return currentAccount.profile_id
    }
    const fromUrl = readAccountFromSearch(searchParams.toString())
    if (fromUrl) return fromUrl

    const hint = venueService.getActiveVenueId()
    if (hint && isAccountsReady) {
      const belongsToUser = accounts.some(
        (account) =>
          account.profile_id === hint &&
          normalizeAccountType(account.account_type) === "venue" &&
          account.is_active,
      )
      if (belongsToUser) return hint
      venueService.clearActiveVenueId()
    }
    return null
  }, [currentAccount?.account_type, currentAccount?.profile_id, searchParams, accounts, isAccountsReady])

  useEffect(() => {
    async function loadProfile() {
      const venueId = resolveVenueId()
      if (venueId) venueService.setCurrentVenueId(venueId)

      const venue = venueId
        ? await venueService.getVenueProfile(venueId)
        : await venueService.getCurrentUserVenue()
      if (!venue) return

      const location = [venue.city, venue.state].filter(Boolean).join(", ")
      const website =
        typeof venue.social_links === "object" && venue.social_links
          ? String((venue.social_links as Record<string, unknown>).website || "")
          : ""
      const contactEmail =
        typeof venue.contact_info === "object" && venue.contact_info
          ? String(
              (venue.contact_info as Record<string, unknown>).booking_email ||
                (venue.contact_info as Record<string, unknown>).email ||
                ""
            )
          : ""
      const phone =
        typeof venue.contact_info === "object" && venue.contact_info
          ? String((venue.contact_info as Record<string, unknown>).phone || "")
          : ""

      setProfile((currentProfile) => ({
        ...currentProfile,
        id: venue.id,
        name: venue.venue_name || currentProfile.name,
        avatar: venue.avatar_url || currentProfile.avatar,
        type: venue.venue_types?.[0] || currentProfile.type,
        description: venue.description || currentProfile.description,
        bio: venue.description || currentProfile.bio,
        artistType: "venue",
        location: location || currentProfile.location,
        website,
        contactEmail,
        phone,
        capacity: venue.capacity ? String(venue.capacity) : currentProfile.capacity,
      }))
    }

    void loadProfile()
  }, [resolveVenueId])

  const value = {
    profile,
    // VEN-035: no fabricated success. EPK creation/upgrade require a real
    // server-backed workflow; callers surface the explicit error to users.
    createEPK: async () => {
      throw new Error("EPK creation is not available yet.")
    },
    upgradeToPremiumEPK: async () => {
      throw new Error("EPK upgrade is not available yet.")
    },
  }
  
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  return useContext(ProfileContext)
}

function getDefaultProfile() {
  return {
    id: "",
    name: "",
    avatar: "",
    type: "",
    description: "",
    bio: "",
    artistType: "venue",
    location: "",
    website: "",
    contactEmail: "",
    phone: "",
    capacity: "",
    theme: "dark",
    skills: [],
    gallery: [],
    experience: [],
    certifications: [],
    bookingSettings: {
      leadTime: "2 weeks",
      autoApprove: "never",
      requireDeposit: false,
      depositAmount: "",
      cancellationPolicy: "",
    },
    notifications: {
      newBookings: true,
      bookingUpdates: true,
      messages: true,
      marketing: false,
    },
    team: {
      members: [],
      roles: [],
    },
    payment: {
      acceptedMethods: [],
      taxRate: "",
      currency: "USD",
    },
  }
}
