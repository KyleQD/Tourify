import type { Metadata } from "next"
import { EnhancedSettingsLayout } from "@/components/settings/enhanced-settings-layout"
import { ArtistSettingsClient } from "./artist-settings-client"

// Prevent pre-rendering since this page requires providers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Artist Settings | Tourify",
  description: "Manage your artist account settings and preferences",
}

export default function ArtistSettingsPage() {
  return (
    <EnhancedSettingsLayout compact>
      <ArtistSettingsClient />
    </EnhancedSettingsLayout>
  )
} 