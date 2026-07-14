import { HiringDashboard, HiringMissingScope } from "@/components/hiring"
import { buildEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function HiringDashboardPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const employer = buildEmployerFromSearchParams({ searchParams: resolvedSearchParams })

  if (!employer) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <HiringMissingScope />
      </main>
    )
  }

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <HiringDashboard employer={employer} initialTab="overview" />
    </main>
  )
}
