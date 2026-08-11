"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccountScopedSettings } from "@/components/settings/account-scoped-settings"
import { AdminPageHeader } from "../components/admin-page-header"

export default function DashboardSettingsPage() {
  return (
    <>
      <AdminPageHeader
        icon={Settings}
        title="Settings"
        subtitle="Account preferences, security, and organization options for the active profile."
        actions={
          <Button asChild variant="outline" size="sm" className="border-slate-600 text-slate-200">
            <Link href="/admin/dashboard/settings/audit">Audit log</Link>
          </Button>
        }
      />
      <AccountScopedSettings />
    </>
  )
}
