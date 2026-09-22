"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Megaphone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkModeAttendanceHistory } from "@/components/work-mode/work-mode-attendance-history";
import type {
  WorkModeApiResponse,
  WorkModeAssignmentListItem,
  WorkModeEventPayload,
  WorkModePublication,
} from "@/types/hiring-roster-work-mode";

interface WorkModeEventWorkspaceProps {
  eventId: string;
  initialAssignmentId: string | null;
  initialSection: string | null;
}

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  schedule: "Schedule",
  tasks: "Tasks",
  updates: "Updates",
  maps: "Maps",
  "day-sheet": "Day Sheet",
  documents: "Documents",
  travel: "Travel",
  pay: "Pay",
  contacts: "Contacts",
  "check-in": "Check-in",
};

function formatDateTime(value: string | null): string {
  if (!value) return "Not published";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function publicationMatches(
  section: string,
  publication: WorkModePublication,
): boolean {
  const type = publication.publicationType;
  if (section === "maps") return type === "site_map";
  if (section === "day-sheet") return type === "day_sheet";
  if (section === "travel")
    return ["travel", "itinerary", "lodging", "transport"].includes(type);
  if (section === "pay")
    return ["pay", "payroll", "compensation"].includes(type);
  if (section === "contacts")
    return ["contacts", "crew_contacts", "contact_sheet"].includes(type);
  if (section === "documents")
    return ![
      "site_map",
      "day_sheet",
      "command_broadcast",
      "event_publish",
      "tour_publish",
      "travel",
      "itinerary",
      "lodging",
      "transport",
      "pay",
      "payroll",
      "compensation",
      "contacts",
      "crew_contacts",
      "contact_sheet",
    ].includes(type);
  return false;
}

export function WorkModeEventWorkspace({
  eventId,
  initialAssignmentId,
  initialSection,
}: WorkModeEventWorkspaceProps) {
  const router = useRouter();
  const [data, setData] = useState<WorkModeEventPayload | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] =
    useState(initialAssignmentId);
  const [section, setSection] = useState(
    initialSection && SECTION_LABELS[initialSection]
      ? initialSection
      : "overview",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [attendanceRevision, setAttendanceRevision] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/work-mode/events/${eventId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as WorkModeApiResponse<WorkModeEventPayload> | null;
      if (!response.ok || !payload?.data)
        throw new Error(
          payload?.error || "Unable to load this event workspace.",
        );
      setData(payload.data);
      setSelectedAssignmentId((current) =>
        payload.data?.assignments.some(
          (assignment) => assignment.id === current,
        )
          ? current
          : payload.data?.assignments[0]?.id || null,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load this event workspace.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedAssignment = useMemo(
    () =>
      data?.assignments.find(
        (assignment) => assignment.id === selectedAssignmentId,
      ) ||
      data?.assignments[0] ||
      null,
    [data, selectedAssignmentId],
  );

  function navigate(nextSection: string, assignmentId = selectedAssignmentId) {
    setSection(nextSection);
    const query = new URLSearchParams();
    if (assignmentId) query.set("assignment", assignmentId);
    if (nextSection !== "overview") query.set("section", nextSection);
    router.replace(
      `/work/events/${eventId}${query.size ? `?${query.toString()}` : ""}`,
      { scroll: false },
    );
  }

  async function attendanceAction(action: "check_in" | "check_out") {
    if (!selectedAssignment) return;
    setActionId(action);
    setStatusMessage(null);
    const response = await fetch(
      `/api/work-mode/assignments/${selectedAssignment.id}/actions`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          clientRequestId: crypto.randomUUID(),
          deviceOccurredAt: new Date().toISOString(),
        }),
      },
    );
    if (response.ok) {
      setStatusMessage(
        action === "check_in" ? "Check-in recorded." : "Check-out recorded.",
      );
      setAttendanceRevision((current) => current + 1);
    } else
      setError(
        (await response.json().catch(() => null))?.error ||
          "Attendance could not be recorded.",
      );
    setActionId(null);
  }

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4">
        <div className="mx-auto max-w-7xl space-y-4" aria-busy="true">
          <Skeleton className="h-40 bg-slate-800" />
          <Skeleton className="h-14 bg-slate-800" />
          <Skeleton className="h-80 bg-slate-800" />
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <AlertCircle className="h-7 w-7 text-rose-300" />
          <h1 className="mt-4 text-xl font-semibold">
            Event workspace unavailable
          </h1>
          <p className="mt-2 text-sm text-rose-100/80">{error}</p>
          <div className="mt-5 flex gap-2">
            <Button asChild variant="outline">
              <Link href="/work/overview">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Overview
              </Link>
            </Button>
            <Button onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </main>
    );
  }
  if (!data || !selectedAssignment) return null;

  const publications = data.publications.filter((publication) =>
    publicationMatches(section, publication),
  );
  const visibleSections = Object.keys(SECTION_LABELS).filter((item) =>
    data.availableSections.includes(item),
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-5 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <Button asChild variant="ghost" size="sm" className="text-slate-300">
          <Link href="/work/overview">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to overview
          </Link>
        </Button>
        <header className="overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-900 p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                {data.event.organizationName || "Work Mode event"}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                {data.event.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-cyan-300" />
                  {formatDateTime(
                    selectedAssignment.startsAt || data.event.startsAt,
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-300" />
                  {data.event.venueName || "Venue to be announced"}
                </span>
              </div>
            </div>
            <div className="w-full lg:w-80">
              <label
                className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400"
                htmlFor="position-switcher"
              >
                Position
              </label>
              <Select
                value={selectedAssignment.id}
                onValueChange={(value) => {
                  setSelectedAssignmentId(value);
                  navigate(section, value);
                }}
              >
                <SelectTrigger
                  id="position-switcher"
                  className="border-slate-700 bg-slate-950/70"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.roleTitle}
                      {assignment.department
                        ? ` · ${assignment.department}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {error ? (
          <div
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {statusMessage ? (
          <div
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100"
            role="status"
          >
            {statusMessage}
          </div>
        ) : null}

        <nav
          className="sticky top-0 z-20 flex gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/95 p-2 backdrop-blur"
          aria-label="Event work sections"
        >
          {visibleSections.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={section === item ? "default" : "ghost"}
              className={
                section === item
                  ? "bg-cyan-600 hover:bg-cyan-500"
                  : "text-slate-300"
              }
              onClick={() => navigate(item)}
              aria-current={section === item ? "page" : undefined}
            >
              {SECTION_LABELS[item]}
            </Button>
          ))}
        </nav>

        <section aria-live="polite">
          {section === "overview" ? (
            <EventOverview
              data={data}
              assignment={selectedAssignment}
              onNavigate={navigate}
            />
          ) : null}
          {section === "schedule" ? (
            <ScheduleSection
              assignments={data.assignments}
              selectedId={selectedAssignment.id}
            />
          ) : null}
          {section === "tasks" ? (
            <div className="grid gap-3">
              {data.tasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-slate-800 bg-slate-900/70"
                >
                  <CardContent className="flex items-start gap-3 p-4">
                    <ClipboardCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {task.dueDate
                          ? `Due ${formatDateTime(task.dueDate)}`
                          : "No due date"}{" "}
                        · {task.status || "assigned"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
          {section === "updates" ? <UpdatesSection data={data} /> : null}
          {[
            "maps",
            "day-sheet",
            "documents",
            "travel",
            "pay",
            "contacts",
          ].includes(section) ? (
            <PublicationSection publications={publications} />
          ) : null}
          {section === "check-in" ? (
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader>
                <CardTitle>Attendance</CardTitle>
                <CardDescription className="text-slate-400">
                  Record attendance for {selectedAssignment.roleTitle}. Server
                  time remains authoritative.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.workerActionsAvailable &&
                selectedAssignment.permissions.check_in_out === true ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={Boolean(actionId)}
                      onClick={() => void attendanceAction("check_in")}
                    >
                      {actionId === "check_in" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Check in
                    </Button>
                    <Button
                      variant="outline"
                      disabled={Boolean(actionId)}
                      onClick={() => void attendanceAction("check_out")}
                    >
                      Check out
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Check-in is not enabled for this position.
                  </p>
                )}
                {data.workerActionsAvailable ? (
                  <WorkModeAttendanceHistory
                    assignmentId={selectedAssignment.id}
                    refreshKey={attendanceRevision}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function EventOverview({
  data,
  assignment,
  onNavigate,
}: {
  data: WorkModeEventPayload;
  assignment: WorkModeAssignmentListItem;
  onNavigate: (section: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-cyan-300" />
            Your shift
          </CardTitle>
          <CardDescription className="text-slate-400">
            {assignment.roleTitle}
            {assignment.department ? ` · ${assignment.department}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-800/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Starts
            </p>
            <p className="mt-1 font-medium">
              {formatDateTime(assignment.startsAt)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Ends
            </p>
            <p className="mt-1 font-medium">
              {formatDateTime(assignment.endsAt)}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-300" />
            Published for you
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {data.availableSections
            .filter((item) => !["overview", "schedule"].includes(item))
            .slice(0, 6)
            .map((item) => (
              <Button
                key={item}
                variant="outline"
                className="justify-start"
                onClick={() => onNavigate(item)}
              >
                {SECTION_LABELS[item]}
              </Button>
            ))}
        </CardContent>
      </Card>
      <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-base">Latest updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.communications.slice(0, 3).map((message) => (
              <button
                key={`${message.source}:${message.id}`}
                onClick={() => onNavigate("updates")}
                className="block w-full rounded-lg bg-slate-800/60 p-3 text-left"
              >
                <p className="text-sm font-medium">{message.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                  {message.body}
                </p>
              </button>
            ))}
            {data.communications.length === 0 ? (
              <p className="text-sm text-slate-400">No updates published.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-base">Next actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.tasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                onClick={() => onNavigate("tasks")}
                className="block w-full rounded-lg bg-slate-800/60 p-3 text-left text-sm"
              >
                {task.title}
              </button>
            ))}
            {data.tasks.length === 0 ? (
              <p className="text-sm text-slate-400">No event tasks assigned.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScheduleSection({
  assignments,
  selectedId,
}: {
  assignments: WorkModeAssignmentListItem[];
  selectedId: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {assignments.map((assignment) => (
        <Card
          key={assignment.id}
          className={`border-slate-800 bg-slate-900/70 ${assignment.id === selectedId ? "ring-2 ring-cyan-400/50" : ""}`}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {assignment.roleTitle}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {assignment.department || "Crew"}
                </CardDescription>
              </div>
              <Badge variant="outline">{assignment.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            {formatDateTime(assignment.startsAt)} —{" "}
            {formatDateTime(assignment.endsAt)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UpdatesSection({ data }: { data: WorkModeEventPayload }) {
  return (
    <div className="space-y-3">
      {data.reminders.map((reminder) => (
        <Card
          key={`reminder:${reminder.id}`}
          className="border-amber-400/25 bg-amber-500/10"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge className="bg-amber-500/15 text-amber-200">Reminder</Badge>
              <time className="text-xs text-amber-100/70">
                {formatDateTime(reminder.remindAt)}
              </time>
            </div>
            <h3 className="mt-3 font-semibold">{reminder.title}</h3>
            <p className="mt-1 text-sm text-slate-300">{reminder.body}</p>
          </CardContent>
        </Card>
      ))}
      {data.communications.map((message) => (
        <Card
          key={`${message.source}:${message.id}`}
          className="border-slate-800 bg-slate-900/70"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline">{message.kind}</Badge>
              <time className="text-xs text-slate-500">
                {formatDateTime(message.sentAt)}
              </time>
            </div>
            <h3 className="mt-3 font-semibold">{message.title}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">
              {message.body}
            </p>
          </CardContent>
        </Card>
      ))}
      {data.communications.length === 0 && data.reminders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
          No event updates have been published.
        </p>
      ) : null}
    </div>
  );
}

function PublicationSection({
  publications,
}: {
  publications: WorkModePublication[];
}) {
  if (!publications.length)
    return (
      <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
        Nothing is published in this section.
      </p>
    );
  return (
    <div className="grid gap-3">
      {publications.map((publication) => (
        <Card key={publication.id} className="border-slate-800 bg-slate-900/70">
          <CardContent className="flex items-center gap-4 p-4">
            <Megaphone className="h-5 w-5 text-cyan-300" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{publication.title}</p>
              <p className="mt-1 text-xs text-slate-400">
                Published {formatDateTime(publication.publishedAt)}
              </p>
            </div>
            {publication.href ? (
              <Button asChild size="sm" variant="outline">
                <Link href={publication.href}>
                  Open <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
