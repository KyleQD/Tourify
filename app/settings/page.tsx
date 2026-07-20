import { Metadata } from "next"
import { EnhancedSettingsRouter } from "@/components/settings/enhanced-settings-router"

export const metadata: Metadata = {
  title: "Account Settings | Tourify",
  description: "Manage your account settings, profile, and preferences",
}

export default function SettingsPage() {
  return <EnhancedSettingsRouter />
}
