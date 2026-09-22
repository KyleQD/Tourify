"use client"

import Link from "next/link"
import { Building2, LockKeyhole, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useActingContext } from "@/hooks/use-acting-context"
import { useAdminCapabilities } from "@/hooks/use-admin-capabilities"

function actingAccountLabel(account: ReturnType<typeof useActingContext>["actingAccount"]): string {
  if (!account) return "No organization selected"
  const profile = account.profile_data || {}
  return profile.organization_name
    || profile.admin_name
    || profile.venue_name
    || profile.artist_name
    || profile.full_name
    || "Active organization"
}

export function AdminActingContextBar() {
  const { actingAccount, actingContextKey, isActingReady } = useActingContext()
  const { capabilities, membershipRole, isLoading, error } = useAdminCapabilities()
  const label = actingAccountLabel(actingAccount)

  return (
    <section
      key={actingContextKey || "no-acting-context"}
      aria-label="Active administration context"
      aria-live="polite"
      className="mb-3 flex min-w-0 flex-wrap items-center gap-2 rounded-sm border border-slate-700/50 bg-slate-900/60 px-3 py-2 backdrop-blur-sm"
    >
      <div className="flex min-w-[12rem] flex-1 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20">
          <Building2 className="h-4 w-4 text-purple-300" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="sr-only">Acting organization</p>
          <p className="truncate text-sm font-semibold text-white">{label}</p>
          {!actingAccount && (
            <p className="truncate text-xs text-slate-400">Select an organization from the account switcher.</p>
          )}
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
        {!isActingReady || isLoading ? (
          <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-200" aria-busy="true">
            <LockKeyhole className="mr-1 h-3 w-3" aria-hidden="true" />
            Checking access…
          </Badge>
        ) : error ? (
          <Badge className="border border-red-500/30 bg-red-500/10 text-red-200">
            Access context unavailable
          </Badge>
        ) : (
          <>
            <Badge className="border border-blue-500/30 bg-blue-500/10 text-blue-200">
              <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
              {membershipRole || "Member"}
            </Badge>
            <Badge className="hidden border border-slate-600 bg-slate-800/80 text-slate-300 sm:inline-flex">
              {capabilities?.length ?? 0} capabilities
            </Badge>
          </>
        )}
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-slate-300 hover:text-white">
          <Link href="/admin/dashboard/organization">Manage organization</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-slate-300 hover:text-white">
          <Link href="/admin/dashboard/rbac">Roles & access</Link>
        </Button>
      </div>
    </section>
  )
}
