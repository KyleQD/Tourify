import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveHiringEntityDisplayName } from "@/lib/auth/hiring-entity-resolver"
import { getWorkerOpsDashboard } from "@/lib/services/worker-ops.service"
import { getWorkModeAssignments } from "@/lib/work-mode/read-model"
import type { Database } from "@/lib/database.types"
import type { HiringEntityType } from "@/types/hiring-entity"
import type {
  WorkerApplication,
  WorkerApplicationStage,
  WorkerApplicationTimelineStep,
  WorkerChannelSummary,
  WorkerEngagement,
  WorkerTask,
  WorkerTour,
  WorkHubHistoryItem,
  WorkHubPayload,
  WorkHubRecommendedJob,
} from "@/types/work-hub"

type FlexibleClient = SupabaseClient<Database> & { from(table: string): any }

export interface WorkerApplicationsReadModel {
  artist_applications: any[]
  venue_applications: any[]
  applications: WorkerApplication[]
  sources: { artist: "ready" | "unavailable"; staffing: "ready" | "unavailable" }
  partial: boolean
  generated_at: string
}

function relation<T extends Record<string, unknown>>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function normalizeApplicationStatus(rawStatus: string | null | undefined): WorkerApplicationStage {
  const status = String(rawStatus || "pending").toLowerCase()
  if (["approved", "accepted", "hired", "onboarded"].includes(status)) return "approved"
  if (["rejected", "declined", "not_selected"].includes(status)) return "declined"
  if (status === "withdrawn") return "withdrawn"
  if (status.includes("interview") || status === "shortlisted") return "interview"
  if (["reviewed", "under_review", "screening"].includes(status)) return "under_review"
  return "applied"
}

function applicationTimeline(args: {
  status: WorkerApplicationStage
  appliedAt: string | null
  reviewedAt: string | null
  rosterStatus?: string | null
  onboardingProgress?: number | null
}): WorkerApplicationTimelineStep[] {
  const rank: Record<WorkerApplicationStage, number> = {
    applied: 0,
    under_review: 1,
    interview: 2,
    approved: 3,
    declined: 3,
    withdrawn: 3,
  }
  const stopped = args.status === "declined" || args.status === "withdrawn"
  const decisionLabel = args.status === "declined" ? "Declined" : args.status === "withdrawn" ? "Withdrawn" : "Approved"
  const onboardingComplete = (args.onboardingProgress ?? 0) >= 100
  const rostered = args.rosterStatus === "active"
  const steps: WorkerApplicationTimelineStep[] = [
    { key: "applied", label: "Applied", state: "complete", at: args.appliedAt },
    {
      key: "review",
      label: "Under review",
      state: rank[args.status] > 1 ? "complete" : rank[args.status] === 1 ? "current" : "upcoming",
      at: args.reviewedAt,
    },
    {
      key: "interview",
      label: "Interview",
      state: rank[args.status] > 2 ? "complete" : rank[args.status] === 2 ? "current" : stopped ? "stopped" : "upcoming",
      at: null,
    },
    {
      key: "decision",
      label: decisionLabel,
      state: rank[args.status] === 3 ? (stopped ? "stopped" : "complete") : "upcoming",
      at: args.reviewedAt,
    },
    {
      key: "onboarding",
      label: "Onboarding",
      state: stopped ? "stopped" : onboardingComplete ? "complete" : args.status === "approved" ? "current" : "upcoming",
      at: null,
    },
    {
      key: "rostered",
      label: "Rostered",
      state: stopped ? "stopped" : rostered ? "complete" : onboardingComplete ? "current" : "upcoming",
      at: null,
    },
  ]
  return steps
}

function employerKey(type: string | null | undefined, id: string | null | undefined): string | null {
  return type && id ? `${type}:${id}` : null
}

async function resolveEmployerNames(
  supabase: SupabaseClient,
  pairs: Array<{ type: string | null | undefined; id: string | null | undefined }>,
): Promise<Map<string, string>> {
  const keys = Array.from(new Set(pairs.map((pair) => employerKey(pair.type, pair.id)).filter(Boolean) as string[]))
  const names = new Map<string, string>()
  await Promise.all(
    keys.map(async (key) => {
      const separator = key.indexOf(":")
      const type = key.slice(0, separator) as HiringEntityType
      const id = key.slice(separator + 1)
      names.set(key, await resolveHiringEntityDisplayName({ supabase, entityType: type, entityId: id }))
    }),
  )
  return names
}

export async function getWorkerApplications(args: {
  supabase: SupabaseClient<Database>
  userId: string
}): Promise<WorkerApplicationsReadModel> {
  const db = args.supabase as FlexibleClient
  const [artistResult, staffingResult] = await Promise.all([
    db
      .from("artist_job_applications")
      .select("id,status,applied_at,job_id,job:artist_jobs(id,title,status,city,state,location)")
      .eq("applicant_id", args.userId)
      .order("applied_at", { ascending: false })
      .limit(80),
    db
      .from("job_applications")
      .select("id,status,applied_at,reviewed_at,feedback,job_posting_id,venue_id,employer_entity_type,employer_entity_id,job_posting:job_posting_templates(id,title,department,position,location,employment_type,status)")
      .eq("applicant_id", args.userId)
      .order("applied_at", { ascending: false })
      .limit(80),
  ])

  const artistRows = artistResult.error ? [] : artistResult.data ?? []
  const staffingRows = staffingResult.error ? [] : staffingResult.data ?? []
  const employerNames = await resolveEmployerNames(
    args.supabase,
    staffingRows.map((row: any) => ({ type: row.employer_entity_type, id: row.employer_entity_id })),
  )

  const applications: WorkerApplication[] = [
    ...artistRows.map((row: any) => {
      const job = relation(row.job)
      const status = normalizeApplicationStatus(row.status)
      return {
        id: row.id,
        source: "artist" as const,
        jobId: row.job_id,
        title: String(job?.title || "Artist job"),
        role: String(job?.title || "Artist job"),
        department: null,
        employerEntityType: null,
        employerEntityId: null,
        employerName: null,
        rawStatus: String(row.status || "pending"),
        normalizedStatus: status,
        appliedAt: row.applied_at ?? null,
        reviewedAt: null,
        href: `/jobs/${row.job_id}?source=artist`,
        timeline: applicationTimeline({ status, appliedAt: row.applied_at ?? null, reviewedAt: null }),
      }
    }),
    ...staffingRows.map((row: any) => {
      const job = relation(row.job_posting)
      const status = normalizeApplicationStatus(row.status)
      const key = employerKey(row.employer_entity_type, row.employer_entity_id)
      return {
        id: row.id,
        source: "staffing" as const,
        jobId: row.job_posting_id,
        title: String(job?.title || job?.position || "Staffing role"),
        role: typeof job?.position === "string" ? job.position : typeof job?.title === "string" ? job.title : null,
        department: typeof job?.department === "string" ? job.department : null,
        employerEntityType: (row.employer_entity_type as HiringEntityType | null) ?? null,
        employerEntityId: row.employer_entity_id ?? null,
        employerName: key ? employerNames.get(key) ?? null : null,
        rawStatus: String(row.status || "pending"),
        normalizedStatus: status,
        appliedAt: row.applied_at ?? null,
        reviewedAt: row.reviewed_at ?? null,
        href: `/jobs/${row.job_posting_id}?source=venue`,
        timeline: applicationTimeline({
          status,
          appliedAt: row.applied_at ?? null,
          reviewedAt: row.reviewed_at ?? null,
        }),
      }
    }),
  ].sort((left, right) => String(right.appliedAt ?? "").localeCompare(String(left.appliedAt ?? "")))

  return {
    artist_applications: artistRows,
    venue_applications: staffingRows,
    applications,
    sources: {
      artist: artistResult.error ? "unavailable" : "ready",
      staffing: staffingResult.error ? "unavailable" : "ready",
    },
    partial: Boolean(artistResult.error || staffingResult.error),
    generated_at: new Date().toISOString(),
  }
}

async function readChannels(args: {
  db: FlexibleClient
  userId: string
  staffMemberIds: string[]
}): Promise<Map<string, WorkerChannelSummary[]>> {
  const byMember = new Map<string, WorkerChannelSummary[]>()
  if (args.staffMemberIds.length === 0) return byMember

  const { data: links, error } = await args.db
    .from("workforce_channel_links")
    .select("staff_member_id,coordinator_thread_id,channel_kind")
    .in("staff_member_id", args.staffMemberIds)
  if (error || !links?.length) return byMember

  const threadIds = Array.from(new Set<string>(links.map((link: any) => String(link.coordinator_thread_id))))
  const [threadsResult, membershipsResult] = await Promise.all([
    args.db.from("group_threads").select("id,name,updated_at").in("id", threadIds),
    args.db
      .from("thread_members")
      .select("thread_id,last_read_at")
      .eq("user_id", args.userId)
      .is("left_at", null)
      .in("thread_id", threadIds),
  ])
  const threads = new Map((threadsResult.data ?? []).map((thread: any) => [thread.id, thread]))
  const reads = new Map((membershipsResult.data ?? []).map((member: any) => [member.thread_id, member.last_read_at]))

  await Promise.all(
    links.map(async (link: any) => {
      const thread = threads.get(link.coordinator_thread_id)
      if (!thread) return
      const latestResult = await args.db
        .from("group_messages")
        .select("content,created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      let unreadCount = 0
      const lastReadAt = reads.get(thread.id)
      if (lastReadAt) {
        const unreadResult = await args.db
          .from("group_messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", thread.id)
          .neq("sender_id", args.userId)
          .gt("created_at", lastReadAt)
        unreadCount = unreadResult.count ?? 0
      }
      const summary: WorkerChannelSummary = {
        threadId: thread.id,
        name: thread.name || "Work coordinator",
        kind: link.channel_kind === "team" ? "team" : "coordinator",
        href: `/groups/${thread.id}`,
        unreadCount,
        latestMessage: latestResult.data?.content ?? null,
        latestMessageAt: latestResult.data?.created_at ?? null,
      }
      byMember.set(link.staff_member_id, [...(byMember.get(link.staff_member_id) ?? []), summary])
    }),
  )
  return byMember
}

async function readRecommendedJobs(db: FlexibleClient): Promise<{
  jobs: WorkHubRecommendedJob[]
  failed: boolean
}> {
  const [artistResult, staffingResult] = await Promise.all([
    db
      .from("artist_jobs")
      .select("id,title,city,state,location,employment_type")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(4),
    db
      .from("job_posting_templates")
      .select("id,title,position,location,employment_type")
      .in("status", ["active", "published", "open"])
      .order("created_at", { ascending: false })
      .limit(4),
  ])
  return {
    jobs: [
      ...(artistResult.error ? [] : artistResult.data ?? []).map((job: any) => ({
        id: job.id,
        source: "artist" as const,
        title: job.title || "Artist job",
        organizationName: null,
        location: job.location || [job.city, job.state].filter(Boolean).join(", ") || null,
        employmentType: job.employment_type ?? null,
        href: `/jobs/${job.id}?source=artist`,
      })),
      ...(staffingResult.error ? [] : staffingResult.data ?? []).map((job: any) => ({
        id: job.id,
        source: "venue" as const,
        title: job.title || job.position || "Staffing role",
        organizationName: null,
        location: job.location ?? null,
        employmentType: job.employment_type ?? null,
        href: `/jobs/${job.id}?source=venue`,
      })),
    ],
    failed: Boolean(artistResult.error && staffingResult.error),
  }
}

async function readConnectedTourWork(args: {
  db: FlexibleClient
  userId: string
  staffMemberIds: string[]
}): Promise<{
  toursByStaff: Map<string, WorkerTour[]>
  tasksByStaff: Map<string, WorkerTask[]>
  failedSources: string[]
}> {
  const toursByStaff = new Map<string, WorkerTour[]>()
  const tasksByStaff = new Map<string, WorkerTask[]>()
  const failedSources: string[] = []
  if (!args.staffMemberIds.length) return { toursByStaff, tasksByStaff, failedSources }

  const [membersResult, assignmentsResult] = await Promise.all([
    args.db.from("tour_team_members")
      .select("id,tour_id,team_id,staff_member_id,role,propagate_to_future_events")
      .in("staff_member_id", args.staffMemberIds).eq("is_active", true),
    args.db.from("workflow_task_assignments")
      .select("id,task_id,staff_member_id,state,blocked_reason")
      .eq("worker_user_id", args.userId).eq("is_active", true),
  ])
  if (membersResult.error) failedSources.push("tourMemberships")
  if (assignmentsResult.error) failedSources.push("workflowTasks")

  const members = membersResult.error ? [] : membersResult.data ?? []
  const tourIds = Array.from(new Set<string>(members.map((member: any) => member.tour_id).filter(Boolean)))
  const memberIds = members.map((member: any) => member.id)
  const teamIds = Array.from(new Set<string>(members.map((member: any) => member.team_id).filter(Boolean)))
  const [toursResult, scopesResult, teamsResult] = await Promise.all([
    tourIds.length ? args.db.from("tours").select("id,name").in("id", tourIds) : Promise.resolve({ data: [], error: null }),
    memberIds.length ? args.db.from("tour_member_event_scopes").select("tour_team_member_id,event_id,origin").in("tour_team_member_id", memberIds).eq("is_active", true) : Promise.resolve({ data: [], error: null }),
    teamIds.length ? args.db.from("tour_teams").select("id,name").in("id", teamIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (scopesResult.error && !failedSources.includes("tourMemberships")) failedSources.push("tourMemberships")
  const scopes = scopesResult.error ? [] : scopesResult.data ?? []
  const eventIds = Array.from(new Set<string>(scopes.map((scope: any) => scope.event_id).filter(Boolean)))
  const eventsResult = eventIds.length
    ? await args.db.from("events_v2").select("id,title,start_at,timezone").in("id", eventIds)
    : { data: [], error: null }
  const tourNames = new Map((toursResult.data ?? []).map((tour: any) => [tour.id, tour.name]))
  const teamNames = new Map((teamsResult.data ?? []).map((team: any) => [team.id, team.name]))
  const events = new Map((eventsResult.data ?? []).map((event: any) => [event.id, event]))
  for (const member of members) {
    const workerTour: WorkerTour = {
      id: member.tour_id,
      membershipId: member.id,
      name: tourNames.get(member.tour_id) || "Tour",
      role: member.role ?? null,
      teamName: member.team_id ? teamNames.get(member.team_id) ?? null : null,
      propagationMode: member.propagate_to_future_events ? "current_and_future_events" : "current_events",
      events: scopes.filter((scope: any) => scope.tour_team_member_id === member.id).map((scope: any) => {
        const event = events.get(scope.event_id)
        return { id: scope.event_id, title: event?.title || "Event", startsAt: event?.start_at ?? null, timezone: event?.timezone ?? null, scopeOrigin: scope.origin }
      }).sort((left: any, right: any) => String(left.startsAt || "9999").localeCompare(String(right.startsAt || "9999"))),
      scheduleState: "not_assigned",
    }
    toursByStaff.set(member.staff_member_id, [...(toursByStaff.get(member.staff_member_id) ?? []), workerTour])
  }

  const taskAssignments = assignmentsResult.error ? [] : assignmentsResult.data ?? []
  const taskIds = taskAssignments.map((assignment: any) => assignment.task_id)
  const tasksResult = taskIds.length
    ? await args.db.from("workflow_tasks").select("id,thread_id,title,description,priority,due_at,staff_shift_plan_id").in("id", taskIds)
    : { data: [], error: null }
  const tasks = new Map((tasksResult.data ?? []).map((task: any) => [task.id, task]))
  const threadIds = Array.from(new Set<string>((tasksResult.data ?? []).map((task: any) => task.thread_id)))
  const threadsResult = threadIds.length
    ? await args.db.from("workflow_threads").select("id,scope_type,scope_id").in("id", threadIds)
    : { data: [], error: null }
  const threads = new Map((threadsResult.data ?? []).map((thread: any) => [thread.id, thread]))
  const taskShiftPlanIds = Array.from(new Set<string>((tasksResult.data ?? []).map((task: any) => task.staff_shift_plan_id).filter(Boolean)))
  const taskPlansResult = taskShiftPlanIds.length
    ? await args.db.from("staff_shift_plans").select("id,title,tour_id,event_id").in("id", taskShiftPlanIds)
    : { data: [], error: null }
  const taskPlans = new Map((taskPlansResult.data ?? []).map((plan: any) => [plan.id, plan]))
  const taskTourIds = Array.from(new Set<string>([
    ...(threadsResult.data ?? []).filter((thread: any) => thread.scope_type === "tour").map((thread: any) => thread.scope_id),
    ...(taskPlansResult.data ?? []).map((plan: any) => plan.tour_id).filter(Boolean),
  ]))
  const taskEventIds = Array.from(new Set<string>([
    ...(threadsResult.data ?? []).filter((thread: any) => thread.scope_type === "event").map((thread: any) => thread.scope_id),
    ...(taskPlansResult.data ?? []).map((plan: any) => plan.event_id).filter(Boolean),
  ]))
  const [taskToursResult, taskEventsResult] = await Promise.all([
    taskTourIds.length ? args.db.from("tours").select("id,name").in("id", taskTourIds) : Promise.resolve({ data: [] }),
    taskEventIds.length ? args.db.from("events_v2").select("id,title").in("id", taskEventIds) : Promise.resolve({ data: [] }),
  ])
  const taskTourNames = new Map((taskToursResult.data ?? []).map((tour: any) => [tour.id, tour.name]))
  const taskEventNames = new Map((taskEventsResult.data ?? []).map((event: any) => [event.id, event.title]))
  for (const assignment of taskAssignments) {
    const task = tasks.get(assignment.task_id)
    if (!task) continue
    const thread = threads.get(task.thread_id)
    const taskPlan = task.staff_shift_plan_id ? taskPlans.get(task.staff_shift_plan_id) : null
    const tourId = thread?.scope_type === "tour" ? thread.scope_id : taskPlan?.tour_id ?? null
    const eventId = thread?.scope_type === "event" ? thread.scope_id : taskPlan?.event_id ?? null
    const workerTask: WorkerTask = {
      id: assignment.id, taskId: task.id, title: task.title, description: task.description ?? null,
      state: assignment.state, priority: task.priority, dueAt: task.due_at ?? null,
      blockedReason: assignment.blocked_reason ?? null, tourId, tourName: tourId ? taskTourNames.get(tourId) ?? null : null,
      eventId, eventName: eventId ? taskEventNames.get(eventId) ?? null : null,
      shiftPlanId: task.staff_shift_plan_id ?? null, shiftTitle: taskPlan?.title ?? null,
      href: `/work#task-${assignment.id}`,
    }
    tasksByStaff.set(assignment.staff_member_id, [...(tasksByStaff.get(assignment.staff_member_id) ?? []), workerTask])
  }
  return { toursByStaff, tasksByStaff, failedSources }
}

export async function getWorkHub(args: {
  supabase: SupabaseClient<Database>
  userId: string
}): Promise<WorkHubPayload> {
  const db = args.supabase as FlexibleClient
  const partialSources: string[] = []
  const [applicationsRead, rosterResult, workModeResult, operationsResult, jobsResult] = await Promise.all([
    getWorkerApplications(args),
    db
      .from("staff_members")
      .select("id,status,position,role,department,onboarding_progress,compliance_status,employer_entity_type,employer_entity_id,org_id,created_at")
      .eq("user_id", args.userId)
      .order("created_at", { ascending: false }),
    getWorkModeAssignments(args.supabase, args.userId).catch(() => null),
    getWorkerOpsDashboard({ supabase: args.supabase, userId: args.userId }).catch(() => null),
    readRecommendedJobs(db),
  ])

  if (applicationsRead.partial) partialSources.push("applications")
  if (rosterResult.error) partialSources.push("roster")
  if (!workModeResult) partialSources.push("assignments", "publications")
  if (!operationsResult) partialSources.push("operations")
  if (jobsResult.failed) partialSources.push("recommendedJobs")

  const rosterRows = rosterResult.error ? [] : rosterResult.data ?? []
  const employerNames = await resolveEmployerNames(
    args.supabase,
    rosterRows.map((row: any) => ({ type: row.employer_entity_type, id: row.employer_entity_id })),
  )
  const channels = await readChannels({
    db,
    userId: args.userId,
    staffMemberIds: rosterRows.map((row: any) => row.id),
  })
  const connectedWork = await readConnectedTourWork({ db, userId: args.userId, staffMemberIds: rosterRows.map((row: any) => row.id) })
  partialSources.push(...connectedWork.failedSources)
  const assignments = workModeResult?.assignments ?? []
  const publications = workModeResult?.publications ?? []
  const activeRosterCount = rosterRows.filter((row: any) => ["pending", "active"].includes(row.status)).length

  const engagements: WorkerEngagement[] = rosterRows
    .filter((row: any) => ["pending", "active"].includes(row.status))
    .map((row: any) => {
      const key = employerKey(row.employer_entity_type, row.employer_entity_id) as string
      const engagementAssignments = assignments.filter(
        (assignment) =>
          assignment.staffMemberId === row.id ||
          employerKey(assignment.employerEntityType, assignment.employerEntityId) === key,
      )
      const approvedApplications = applicationsRead.applications
        .filter(
          (application) =>
            employerKey(application.employerEntityType, application.employerEntityId) === key &&
            application.normalizedStatus === "approved",
        )
        .map((application) => ({
          ...application,
          timeline: applicationTimeline({
            status: application.normalizedStatus,
            appliedAt: application.appliedAt,
            reviewedAt: application.reviewedAt,
            rosterStatus: row.status,
            onboardingProgress: row.onboarding_progress,
          }),
        }))
      const channelRows = channels.get(row.id) ?? []
      const eventIds = new Set(engagementAssignments.map((assignment) => assignment.eventId).filter(Boolean))
      const engagementTours = (connectedWork.toursByStaff.get(row.id) ?? []).map((tour) => ({
        ...tour,
        scheduleState: engagementAssignments.some((assignment) => assignment.tourId === tour.id && assignment.assignmentKind === "shift") ? "scheduled" as const : "not_assigned" as const,
      }))
      const connectedTasks = connectedWork.tasksByStaff.get(row.id) ?? []
      const hasInvited = engagementAssignments.some((assignment) => assignment.status === "invited")
      const hasScheduled = engagementAssignments.some(
        (assignment) =>
          assignment.assignmentKind === "shift" &&
          ["confirmed", "active"].includes(assignment.status),
      )
      const hasCompleted = engagementAssignments.some((assignment) => assignment.status === "completed")
      const primaryAssignment = engagementAssignments.find(
        (assignment) => !["completed", "cancelled", "declined"].includes(assignment.status),
      )
      const eventBrief = primaryAssignment
        ? publications.find(
            (publication) =>
              publication.publicationType === "event_publish" &&
              ((primaryAssignment.eventId && publication.eventId === primaryAssignment.eventId) ||
                (primaryAssignment.tourId && publication.tourId === primaryAssignment.tourId)),
          )?.payload ?? null
        : null
      return {
        id: row.id,
        employerEntityType: row.employer_entity_type as HiringEntityType,
        employerEntityId: row.employer_entity_id,
        employerName: employerNames.get(key) ?? "Employer",
        rosterStatus: row.status,
        role: row.position || row.role || approvedApplications[0]?.role || "Staff member",
        department: row.department ?? approvedApplications[0]?.department ?? null,
        onboardingProgress: Math.max(0, Math.min(100, row.onboarding_progress ?? 0)),
        complianceStatus: row.compliance_status ?? null,
        scheduleState: hasScheduled ? "scheduled" : hasInvited ? "invited" : hasCompleted ? "completed" : "not_assigned",
        coordinatorChannel: channelRows.find((channel) => channel.kind === "coordinator") ?? null,
        teamChannels: channelRows.filter((channel) => channel.kind === "team"),
        approvedApplications,
        assignments: engagementAssignments,
        tours: engagementTours,
        tasks: connectedTasks,
        eventBrief,
        operations: {
          tasks: (operationsResult?.tasks ?? [])
            .filter((task) => task.eventId && eventIds.has(task.eventId))
            .map((task) => ({ id: task.id, title: task.title, status: task.status, dueDate: task.dueDate })),
          travel:
            activeRosterCount === 1
              ? (operationsResult?.travel ?? []).map((travel) => ({ id: travel.id, name: travel.groupName, status: travel.status }))
              : [],
          lodging:
            activeRosterCount === 1
              ? (operationsResult?.lodging ?? []).map((lodging) => ({ id: lodging.id, roomNumber: lodging.roomNumber, status: lodging.status }))
              : [],
        },
        createdAt: row.created_at ?? null,
      }
    })

  const engagementByEmployer = new Map(
    engagements.map((engagement) => [employerKey(engagement.employerEntityType, engagement.employerEntityId), engagement]),
  )
  const applications = applicationsRead.applications.map((application) => {
    const engagement = engagementByEmployer.get(employerKey(application.employerEntityType, application.employerEntityId))
    return engagement
      ? {
          ...application,
          timeline: applicationTimeline({
            status: application.normalizedStatus,
            appliedAt: application.appliedAt,
            reviewedAt: application.reviewedAt,
            rosterStatus: engagement.rosterStatus,
            onboardingProgress: engagement.onboardingProgress,
          }),
        }
      : application
  })

  const attention = [
    ...engagements
      .filter((engagement) => engagement.onboardingProgress < 100)
      .map((engagement) => ({
        id: `onboarding:${engagement.id}`,
        kind: "onboarding" as const,
        title: `Finish onboarding for ${engagement.employerName}`,
        description: `${engagement.onboardingProgress}% complete · ${engagement.role}`,
        href: "/onboarding",
        employerName: engagement.employerName,
        assignmentId: null,
        publicationId: null,
        taskAssignmentId: null,
      })),
    ...assignments
      .filter((assignment) => assignment.status === "invited")
      .map((assignment) => ({
        id: `assignment:${assignment.id}`,
        kind: "shift_invitation" as const,
        title: assignment.assignmentKind === "shift" ? `Respond to ${assignment.roleTitle} shift` : `Respond to ${assignment.roleTitle} assignment`,
        description: assignment.eventTitle || assignment.employerName || "Work invitation",
        href: `/work/assignments?assignment=${assignment.id}`,
        employerName: assignment.employerName ?? null,
        assignmentId: assignment.id,
        publicationId: null,
        taskAssignmentId: null,
      })),
    ...publications
      .filter((publication) => publication.requiresAcknowledgement && !publication.acknowledgedAt)
      .map((publication) => ({
        id: `publication:${publication.id}`,
        kind: "acknowledgement" as const,
        title: `Acknowledge ${publication.title}`,
        description: "Your employer requires acknowledgement of this event update.",
        href: publication.href || `/work/publications/${publication.id}`,
        employerName: null,
        assignmentId: null,
        publicationId: publication.id,
        taskAssignmentId: null,
      })),
    ...engagements.flatMap((engagement) => engagement.tasks.filter((task) => task.state === "assigned").map((task) => ({
      id: `task-ack:${task.id}`, kind: "task_acknowledgement" as const, title: `Acknowledge ${task.title}`,
      description: [task.tourName, task.eventName, engagement.employerName].filter(Boolean).join(" · "), href: task.href,
      employerName: engagement.employerName, assignmentId: null, publicationId: null, taskAssignmentId: task.id,
    }))),
    ...engagements.flatMap((engagement) => engagement.tasks.filter((task) => task.state === "blocked").map((task) => ({
      id: `task-blocked:${task.id}`, kind: "blocked_task" as const, title: `${task.title} is blocked`,
      description: task.blockedReason || "Review the blocker and resume when ready.", href: task.href,
      employerName: engagement.employerName, assignmentId: null, publicationId: null, taskAssignmentId: task.id,
    }))),
    ...engagements.flatMap((engagement) => engagement.tasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < Date.now() && !["done", "cancelled"].includes(task.state)).map((task) => ({
      id: `task-overdue:${task.id}`, kind: "overdue_task" as const, title: `${task.title} is overdue`,
      description: `Due ${task.dueAt ? new Date(task.dueAt).toLocaleString() : ""}`, href: task.href,
      employerName: engagement.employerName, assignmentId: null, publicationId: null, taskAssignmentId: task.id,
    }))),
  ]

  const history: WorkHubHistoryItem[] = [
    ...assignments
      .filter((assignment) => ["completed", "cancelled", "declined"].includes(assignment.status))
      .map((assignment) => ({
        id: assignment.id,
        kind: "assignment" as const,
        title: assignment.eventTitle || assignment.roleTitle,
        employerName: assignment.employerName ?? null,
        status: assignment.status,
        at: assignment.endsAt || assignment.startsAt,
        href: `/work/assignments?assignment=${assignment.id}`,
      })),
    ...rosterRows
      .filter((row: any) => !["pending", "active"].includes(row.status))
      .map((row: any) => {
        const key = employerKey(row.employer_entity_type, row.employer_entity_id)
        return {
          id: row.id,
          kind: "engagement" as const,
          title: row.position || row.role || "Roster relationship",
          employerName: key ? employerNames.get(key) ?? null : null,
          status: row.status,
          at: row.created_at ?? null,
          href: null,
        }
      }),
  ]

  const appliedKeys = new Set(applications.map((application) => `${application.source === "staffing" ? "venue" : "artist"}:${application.jobId}`))
  return {
    attention,
    applications,
    engagements,
    assignments,
    publications,
    recommendedJobs: jobsResult.jobs.filter((job) => !appliedKeys.has(`${job.source}:${job.id}`)),
    history,
    partialSources,
    generatedAt: new Date().toISOString(),
    workerActionsAvailable: workModeResult?.workerActionsAvailable ?? false,
  }
}
