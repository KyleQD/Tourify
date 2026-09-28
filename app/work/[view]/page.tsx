import { notFound, redirect } from "next/navigation"

import { WorkModeWorkspace } from "@/components/work-mode/work-mode-workspace"
import { isWorkModeView } from "@/lib/work-mode/navigation"

export default async function WorkModePage({
  params,
  searchParams,
}: {
  params: Promise<{ view: string }>
  searchParams: Promise<{ assignment?: string; panel?: string }>
}) {
  const [{ view }, { assignment, panel }] = await Promise.all([params, searchParams])
  if (view === "today") {
    redirect(`/work/overview${assignment ? `?assignment=${encodeURIComponent(assignment)}` : ""}`)
  }
  if (!isWorkModeView(view)) notFound()

  return <WorkModeWorkspace view={view} initialAssignmentId={assignment ?? null} initialPanel={panel ?? null} />
}
