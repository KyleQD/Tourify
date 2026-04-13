"use client"

// Prevent pre-rendering since this page requires profile context
export const dynamic = 'force-dynamic'

import { useState } from "react"
import { EPKCreator } from "../../components/epk/epk-creator"
import { EPKPreview } from "../../components/epk/epk-preview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"
// import { useProfile } from "../../context/profile-context"

export default function EPKPage() {
  const [activeTab, setActiveTab] = useState("create")

  // Fallback profile data if ProfileProvider is not available
  const fallbackProfile = {
    id: "1",
    name: "Test Venue",
    avatar: "/placeholder.svg",
    type: "Concert Hall",
    description: "A premier venue for live music events",
    location: "New York, NY",
    website: "https://testvenue.com",
    contactEmail: "contact@testvenue.com",
    phone: "+1 (555) 123-4567",
    capacity: "500",
    skills: ["Live Music", "Event Planning", "Sound Engineering"],
    experience: [
      {
        title: "Venue Manager",
        company: "Test Venue",
        duration: "2020 - Present"
      }
    ],
    certifications: [
      {
        title: "Event Management Certification",
        organization: "Event Management Institute",
        year: "2021"
      }
    ],
    theme: "dark",
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
      members: [] as any[],
      roles: [] as any[],
    },
    payment: {
      acceptedMethods: [] as string[],
      taxRate: "",
      currency: "USD",
    },
  }

  // Use fallback profile for now to avoid ProfileProvider issues
  const profile = fallbackProfile

  // Mock EPK data based on profile
  const mockEpkData = profile
    ? {
        ...profile,
        genres: ["Rock", "Alternative", "Indie"],
      }
    : null

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="create">Create EPK</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="premium">Premium Features</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <EPKCreator />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <EPKPreview epkData={mockEpkData} />
        </TabsContent>

        <TabsContent value="premium" className="mt-6">
          <EPKPreview epkData={mockEpkData} isPremium={true} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
