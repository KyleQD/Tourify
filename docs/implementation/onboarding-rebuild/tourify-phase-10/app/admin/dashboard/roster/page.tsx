import { TeamRosterPanel } from "@/components/hiring/team-roster-panel"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { buildEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"

interface RosterPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

export default async function RosterPage({ searchParams }: RosterPageProps) {
  const resolvedSearchParams = await searchParams
  const employer = buildEmployerFromSearchParams({
    searchParams: resolvedSearchParams,
    fallbackDisplayName: "Hiring account",
  })

  if (!employer) {
    return (
      <div className="p-6">
        <HiringMissingScope
          title="Roster scope required"
          description="Select a Venue, Organization, or Artist before loading the live staff roster."
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <TeamRosterPanel employer={employer} />
    </div>
  )
}
