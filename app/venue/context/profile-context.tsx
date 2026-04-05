"use client"
import { createContext, useContext, useEffect, useState } from "react"
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

  useEffect(() => {
    async function loadProfile() {
      const venue = await venueService.getCurrentUserVenue()
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
  }, [])

  const value = {
    profile,
    createEPK: async () => {
      // Simulate EPK creation and return a URL
      return "https://tourify.com/epk/username"
    },
    upgradeToPremiumEPK: async () => {
      // Simulate a successful upgrade
      return true
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
