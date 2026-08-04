import type { Metadata } from "next"
import { EnhancedSettingsLayout } from "@/components/settings/enhanced-settings-layout"
import { AccountScopedSettings } from "@/components/settings/account-scoped-settings"
import { VenueSettingsPublicLink } from "./venue-settings-public-link"

// Prevent pre-rendering since this page requires providers
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Venue Settings | Tourify",
  description: "Manage your venue account settings and preferences",
}

export default function VenueSettingsPage() {
  return (
    <EnhancedSettingsLayout>
      <VenueSettingsPublicLink />
      <AccountScopedSettings />
    </EnhancedSettingsLayout>
  )
} 