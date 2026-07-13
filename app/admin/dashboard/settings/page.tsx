"use client"

import { Settings } from "lucide-react"
import { AccountScopedSettings } from "@/components/settings/account-scoped-settings"
import { AdminPageHeader } from "../components/admin-page-header"

export default function DashboardSettingsPage() {
  return (
    <>
      <AdminPageHeader
        icon={Settings}
        title="Settings"
        subtitle="Account preferences, security, and organization options for the active profile."
      />
      <AccountScopedSettings />
    </>
  )
}
