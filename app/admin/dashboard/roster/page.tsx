import { TeamRosterPanel } from "@/components/hiring/team-roster-panel"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveEmployerFromEventRow } from "@/lib/admin/admin-ops-context"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"
import { createClient } from "@/lib/supabase/server"
import type { HiringEntity } from "@/types/hiring-entity"

interface RosterPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

async function resolveEmployerFromEventId(eventId: string): Promise<HiringEntity | null> {
  try {
    const supabase = await createClient()
    const { data: event } = await supabase
      .from("events_v2")
      .select("id, org_id, venue_id, settings")
      .eq("id", eventId)
      .maybeSingle()
    if (!event) return null

    const employer = resolveEmployerFromEventRow(event)
    if (!employer.entityType || !employer.entityId) return null

    return {
      entityType: employer.entityType,
      entityId: employer.entityId,
      displayName: employer.entityType === "venue" ? "Venue employer" : "Organization employer",
      scope: {
        eventId,
        venueId: employer.venueId || undefined,
      },
    }
  } catch {
    return null
  }
}

export default async function RosterPage({ searchParams }: RosterPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const tourId = firstParam(resolvedSearchParams.tourId)
  const eventId = firstParam(resolvedSearchParams.eventId)

  let employer = await resolveAdminWorkforceEmployer({
    searchParams: resolvedSearchParams,
    fallbackDisplayName: "Hiring account",
  })

  if (!employer && eventId) {
    employer = await resolveEmployerFromEventId(eventId)
  }

  if (!employer) {
    return (
      <WorkforcePageShell>
        <HiringMissingScope
          title="Roster scope required"
          description="Select a Venue, Organization, or Artist before loading the live staff roster."
        />
      </WorkforcePageShell>
    )
  }

  return (
    <WorkforcePageShell>
      <TeamRosterPanel employer={employer} eventId={eventId} tourId={tourId} />
    </WorkforcePageShell>
  )
}
