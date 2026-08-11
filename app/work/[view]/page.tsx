import { notFound } from "next/navigation"

import { WorkModeWorkspace } from "@/components/work-mode/work-mode-workspace"
import { isWorkModeView } from "@/lib/work-mode/navigation"

export default async function WorkModePage({
  params,
  searchParams,
}: {
  params: Promise<{ view: string }>
  searchParams: Promise<{ assignment?: string }>
}) {
  const [{ view }, { assignment }] = await Promise.all([params, searchParams])
  if (!isWorkModeView(view)) notFound()

  return <WorkModeWorkspace view={view} initialAssignmentId={assignment ?? null} />
}
