import { WorkModeEventWorkspace } from "@/components/work-mode/work-mode-event-workspace";

export default async function WorkerEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ assignment?: string; section?: string }>;
}) {
  const [{ eventId }, { assignment, section }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <WorkModeEventWorkspace
      eventId={eventId}
      initialAssignmentId={assignment ?? null}
      initialSection={section ?? null}
    />
  );
}
