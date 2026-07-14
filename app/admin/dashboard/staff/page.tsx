import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { StaffSchedulingTab } from "@/components/admin/staff-scheduling-tab"
import { StaffOperationsTabs } from "@/components/hiring/staff-operations-tabs"
import { WorkforceHero, WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"

export const dynamic = "force-dynamic"

type StaffOperationsTab =
  | "overview"
  | "roster"
  | "applications"
  | "onboarding"
  | "jobs"
  | "audit"
  | "scheduling"

const VALID_TABS = new Set<StaffOperationsTab>([
  "overview",
  "roster",
  "applications",
  "onboarding",
  "jobs",
  "audit",
  "scheduling",
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
          <WorkforceHero
            eyebrow="Staff Operations"
            title="Staff Operations HQ"
            description="Hire, onboard, and schedule crew for your organization. Live mode uses your acting account when scope is missing from the URL."
            badge="scheduling"
          />
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
      <WorkforceHero
        eyebrow="Staff Operations"
        title="Staff Operations HQ"
        description={`Your command center to hire, onboard, and manage the crew for ${employer.displayName}.`}
        badge={employer.entityType}
      />
      <StaffOperationsTabs employer={employer} initialTab={initialTab} />
    </WorkforcePageShell>
  )
}
