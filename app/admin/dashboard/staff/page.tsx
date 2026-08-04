import { redirect } from "next/navigation"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { StaffSchedulingTab } from "@/components/admin/staff-scheduling-tab"
import { StaffOperationsTabs } from "@/components/hiring/staff-operations-tabs"
import { WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"
import { legacyStaffOperationsRedirect } from "@/lib/admin/staff-operations-routing"

export const dynamic = "force-dynamic"

type StaffOperationsTab =
  | "overview"
  | "scheduling"
  | "team"
  | "analytics"

const VALID_TABS = new Set<StaffOperationsTab>([
  "overview",
  "scheduling",
  "team",
  "analytics",
])

interface StaffOperationsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function resolveInitialTab(value: string | string[] | undefined): StaffOperationsTab {
  const tab = Array.isArray(value) ? value[0] : value
  return tab && VALID_TABS.has(tab as StaffOperationsTab) ? (tab as StaffOperationsTab) : "overview"
}

export default async function StaffOperationsPage({ searchParams }: StaffOperationsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const legacyRedirect = legacyStaffOperationsRedirect(resolvedSearchParams)
  if (legacyRedirect) redirect(legacyRedirect)
  const initialTab = resolveInitialTab(resolvedSearchParams.tab)
  const employer = await resolveAdminWorkforceEmployer({
    searchParams: resolvedSearchParams,
    fallbackDisplayName: "Hiring account",
  })

  if (!employer) {
    // Scheduling can hydrate employer from the client acting account (org switcher).
    // Other tabs still require server-resolved scope.
    if (initialTab === "scheduling") {
      return (
        <WorkforcePageShell>
          <StaffSchedulingTab />
        </WorkforcePageShell>
      )
    }

    return (
      <WorkforcePageShell>
        <HiringMissingScope
          title="Workforce scope required"
          description="Select a Venue, Organization, or Artist to open the Staff Operations HQ."
        />
      </WorkforcePageShell>
    )
  }

  return (
    <WorkforcePageShell>
      <StaffOperationsTabs employer={employer} initialTab={initialTab} />
    </WorkforcePageShell>
  )
}
