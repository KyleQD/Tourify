"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Sparkles,
  X,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  WorkModeAttentionItem,
  WorkModeAssignmentListItem,
  WorkModeCommunication,
  WorkModeEventSummary,
  WorkModeReminder,
  WorkModeSourceAvailability,
  WorkModeTaskItem,
} from "@/types/hiring-roster-work-mode";

interface WorkModeOverviewProps {
  assignments: WorkModeAssignmentListItem[];
  events: WorkModeEventSummary[];
  tasks: WorkModeTaskItem[];
  communications: WorkModeCommunication[];
  reminders: WorkModeReminder[];
  attention: WorkModeAttentionItem[];
  unreadCount: number;
  sourceAvailability: WorkModeSourceAvailability | null;
  initialAssignmentId: string | null;
  initialPanel?: string | null;
  respondingId: string | null;
  onAssignmentResponse: (
    assignmentId: string,
    action: "accept" | "decline",
  ) => void;
  onCommunicationResponse: (
    id: string,
    source: "team_communication" | "event_bulletin",
    action: "mark_read" | "acknowledge",
  ) => Promise<boolean>;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Time to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function priorityClass(priority: string): string {
  if (["urgent", "emergency"].includes(priority))
    return "border-rose-400/40 bg-rose-500/10 text-rose-200";
  if (["high", "important"].includes(priority))
    return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  return "border-slate-700 bg-slate-800/70 text-slate-300";
}

function EmptySummary({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-700/80 px-4 py-6 text-sm text-slate-400">
      {children}
    </p>
  );
}

export function WorkModeOverview({
  assignments,
  events,
  tasks,
  communications,
  reminders,
  attention,
  unreadCount,
  sourceAvailability,
  initialAssignmentId,
  initialPanel,
  respondingId,
  onAssignmentResponse,
  onCommunicationResponse,
}: WorkModeOverviewProps) {
  const [messagesOpen, setMessagesOpen] = useState(initialPanel === "messages");
  const [updatingMessageId, setUpdatingMessageId] = useState<string | null>(
    null,
  );
  const activeTasks = tasks.filter(
    (task) =>
      !["done", "completed", "cancelled"].includes(
        String(task.status || "").toLowerCase(),
      ),
  );
  const updates = communications.filter((message) => message.kind === "update");
  const messages = communications.filter(
    (message) => message.kind === "message",
  );
  const partialSources = sourceAvailability
    ? Object.entries(sourceAvailability)
        .filter(([, state]) => state === "unavailable")
        .map(([source]) => source)
    : [];

  useEffect(() => {
    if (initialPanel === "messages") setMessagesOpen(true);
  }, [initialPanel]);

  const nextEvent = useMemo(
    () => events.find((event) => event.href) || events[0] || null,
    [events],
  );

  async function respondToMessage(
    message: WorkModeCommunication,
    action: "mark_read" | "acknowledge",
  ) {
    if (message.source === "publication") return;
    setUpdatingMessageId(message.id);
    await onCommunicationResponse(message.id, message.source, action);
    setUpdatingMessageId(null);
  }

  return (
    <div className="space-y-5">
      {partialSources.length ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4"
          role="status"
        >
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-amber-100">
              Some work information is temporarily unavailable
            </p>
            <p className="text-sm text-amber-200/75">
              Available sections remain usable. Retry to reload{" "}
              {partialSources.join(", ")}.
            </p>
          </div>
        </div>
      ) : null}

      <section aria-labelledby="attention-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Start here
            </p>
            <h2
              id="attention-heading"
              className="mt-1 text-xl font-semibold text-white"
            >
              Needs your attention
            </h2>
          </div>
          <Badge className="bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/15">
            {attention.length} open
          </Badge>
        </div>
        {attention.length === 0 ? (
          <Card className="border-emerald-400/20 bg-emerald-500/10">
            <CardContent className="flex items-center gap-3 p-4 text-emerald-100">
              <CheckCircle2
                className="h-5 w-5 text-emerald-300"
                aria-hidden="true"
              />
              <p className="text-sm">
                You’re caught up. New shift invitations and urgent admin updates
                will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attention.slice(0, 6).map((item) => (
              <Card
                key={item.id}
                className="border-slate-700/80 bg-slate-900/80"
              >
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Badge
                      variant="outline"
                      className={priorityClass(item.priority)}
                    >
                      {item.kind.replaceAll("_", " ")}
                    </Badge>
                    {item.dueAt ? (
                      <span className="text-xs text-slate-400">
                        {formatDateTime(item.dueAt)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-100">{item.title}</p>
                    {item.detail ? (
                      <p className="mt-1 text-sm text-slate-400">
                        {item.detail}
                      </p>
                    ) : null}
                  </div>
                  {item.kind === "invitation" && item.assignmentId ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          onAssignmentResponse(item.assignmentId!, "accept")
                        }
                        disabled={respondingId === item.assignmentId}
                      >
                        <Check className="mr-1.5 h-4 w-4" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onAssignmentResponse(item.assignmentId!, "decline")
                        }
                        disabled={respondingId === item.assignmentId}
                      >
                        <X className="mr-1.5 h-4 w-4" /> Decline
                      </Button>
                    </div>
                  ) : item.href ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-fit"
                    >
                      <Link href={item.href}>
                        Review <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="upcoming-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2
              id="upcoming-heading"
              className="text-xl font-semibold text-white"
            >
              Upcoming positions
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Your next accepted events and every role you’re working.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-cyan-200">
            <Link href="/work/schedule">Full schedule</Link>
          </Button>
        </div>
        {events.length === 0 ? (
          <EmptySummary>
            Accepted event positions will appear here as soon as an organization
            assigns them.
          </EmptySummary>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {events.slice(0, 6).map((event) => {
              const highlighted = event.assignments.some(
                (assignment) => assignment.id === initialAssignmentId,
              );
              const card = (
                <Card
                  className={`h-full border-slate-700/80 bg-gradient-to-br from-slate-900 to-slate-900/70 transition ${event.href ? "hover:-translate-y-0.5 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-950/30" : ""} ${highlighted ? "ring-2 ring-cyan-400/60" : ""}`}
                >
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                          {event.organizationName || "Your organization"}
                        </p>
                        <h3 className="mt-1 truncate text-lg font-semibold text-white">
                          {event.title}
                        </h3>
                      </div>
                      {event.href ? (
                        <ChevronRight
                          className="mt-1 h-5 w-5 shrink-0 text-slate-500"
                          aria-hidden="true"
                        />
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-400/40 text-amber-200"
                        >
                          Invitation
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-500" />
                        {formatDateTime(
                          event.assignments[0]?.startsAt || event.startsAt,
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        {event.venueName || "Venue to be announced"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {event.assignments.map((assignment) => (
                        <Badge
                          key={assignment.id}
                          variant="secondary"
                          className="bg-slate-800 text-slate-200"
                        >
                          {assignment.roleTitle} · {assignment.status}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
              return event.href ? (
                <Link
                  key={event.eventId}
                  href={event.href}
                  className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {card}
                </Link>
              ) : (
                <div key={event.eventId}>{card}</div>
              );
            })}
          </div>
        )}
      </section>

      <section
        className="grid gap-4 lg:grid-cols-2"
        aria-label="Work summaries"
      >
        <SummaryCard
          title="Tasks"
          description={`${activeTasks.length} open`}
          icon={ClipboardCheck}
          href="/work/tasks"
        >
          {activeTasks.length ? (
            activeTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-lg bg-slate-800/55 p-3"
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${task.priority === "high" ? "bg-amber-400" : "bg-cyan-400"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {task.dueDate
                      ? `Due ${formatDateTime(task.dueDate)}`
                      : task.kind === "onboarding"
                        ? "Onboarding action"
                        : "No due date"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptySummary>No open tasks.</EmptySummary>
          )}
        </SummaryCard>

        <SummaryCard
          title="Updates"
          description={`${updates.filter((item) => !item.isRead).length} unread`}
          icon={Sparkles}
          href="/work/updates"
        >
          {updates.length ? (
            updates.slice(0, 4).map((update) => (
              <Link
                key={`${update.source}:${update.id}`}
                href={update.href}
                className="block rounded-lg bg-slate-800/55 p-3 transition hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-1 text-sm font-medium text-slate-100">
                    {update.title}
                  </p>
                  {!update.isRead ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                  {update.body}
                </p>
              </Link>
            ))
          ) : (
            <EmptySummary>No published updates.</EmptySummary>
          )}
        </SummaryCard>

        <SummaryCard
          title="Messages"
          description={`${unreadCount} unread across messages and reminders`}
          icon={MessageSquareText}
          onOpen={() => setMessagesOpen(true)}
        >
          {messages.length ? (
            messages.slice(0, 4).map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => setMessagesOpen(true)}
                className="w-full rounded-lg bg-slate-800/55 p-3 text-left transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-1 text-sm font-medium text-slate-100">
                    {message.title}
                  </p>
                  {!message.isRead ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {message.organizationName ||
                    message.senderName ||
                    "Organization admin"}
                </p>
              </button>
            ))
          ) : (
            <EmptySummary>No admin messages.</EmptySummary>
          )}
        </SummaryCard>

        <SummaryCard
          title="Reminders"
          description={`${reminders.length} scheduled`}
          icon={BellRing}
          href={nextEvent?.href || "/work/overview"}
        >
          {reminders.length ? (
            reminders.slice(0, 4).map((reminder) => (
              <Link
                key={reminder.id}
                href={reminder.href}
                className="flex items-start gap-3 rounded-lg bg-slate-800/55 p-3 transition hover:bg-slate-800"
              >
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium text-slate-100">
                    {reminder.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(reminder.remindAt)}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <EmptySummary>No scheduled reminders.</EmptySummary>
          )}
        </SummaryCard>
      </section>

      <Dialog open={messagesOpen} onOpenChange={setMessagesOpen}>
        <DialogContent className="max-h-[88vh] border-slate-700 bg-slate-950 text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-300" />
              Organization messages
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Messages and updates sent by your organization administrators.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[62vh] pr-4">
            <div className="space-y-3">
              {communications.length ? (
                communications.map((message) => (
                  <article
                    key={`${message.source}:${message.id}`}
                    className={`rounded-xl border p-4 ${message.isRead ? "border-slate-800 bg-slate-900/60" : "border-cyan-400/30 bg-cyan-500/5"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={priorityClass(message.priority)}
                          >
                            {message.kind}
                          </Badge>
                          {!message.isRead ? (
                            <Badge className="bg-cyan-500/15 text-cyan-200">
                              New
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="mt-2 font-semibold text-white">
                          {message.title}
                        </h3>
                      </div>
                      <time className="shrink-0 text-xs text-slate-500">
                        {formatDateTime(message.sentAt)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {message.body}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {message.organizationName ||
                        message.senderName ||
                        "Organization admin"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.source !== "publication" && !message.isRead ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingMessageId === message.id}
                          onClick={() =>
                            void respondToMessage(message, "mark_read")
                          }
                        >
                          Mark read
                        </Button>
                      ) : null}
                      {message.source !== "publication" &&
                      message.requiresAcknowledgment &&
                      !message.isAcknowledged ? (
                        <Button
                          size="sm"
                          disabled={updatingMessageId === message.id}
                          onClick={() =>
                            void respondToMessage(message, "acknowledge")
                          }
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Acknowledge
                        </Button>
                      ) : null}
                      <Button asChild size="sm" variant="ghost">
                        <Link href={message.href}>
                          Open details <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptySummary>
                  No messages or updates have been sent yet.
                </EmptySummary>
              )}
            </div>
          </ScrollArea>
          <Button asChild variant="outline" className="w-full">
            <Link href="/messages?tab=work">Open all messages</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  title,
  description,
  icon: Icon,
  href,
  onOpen,
  children,
}: {
  title: string;
  description: string;
  icon: typeof ClipboardCheck;
  href?: string;
  onOpen?: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/75">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Icon className="h-4 w-4 text-cyan-300" />
            {title}
          </CardTitle>
          <CardDescription className="mt-1 text-slate-400">
            {description}
          </CardDescription>
        </div>
        {onOpen ? (
          <Button size="sm" variant="ghost" onClick={onOpen}>
            Open
          </Button>
        ) : href ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={href}>View all</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}
