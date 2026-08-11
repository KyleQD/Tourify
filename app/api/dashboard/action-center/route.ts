import { NextResponse } from "next/server"

import {
  profileCompletion,
  type GeneralActionCenterPayload,
  type GeneralActionItem,
  type GeneralActionSource,
  type GeneralProfileSummary,
} from "@/lib/general/action-center"
import { createClient } from "@/lib/supabase/server"

interface SourceResult {
  source: GeneralActionSource
  count: number | null
  state: "ready" | "unavailable"
}

function result(
  source: GeneralActionSource,
  response: { count: number | null; error: { message?: string } | null },
): SourceResult {
  if (response.error) {
    console.error(`[dashboard/action-center] ${source} unavailable`, response.error.message)
    return { source, count: null, state: "unavailable" }
  }
  return { source, count: response.count ?? 0, state: "ready" }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view your action center.", code: "not_authenticated" },
      { status: 401 },
    )
  }

  const [
    artistApplicationsResponse,
    staffingApplicationsResponse,
    ticketsResponse,
    messagesResponse,
    assignmentsResponse,
    profileResponse,
  ] = await Promise.all([
    supabase
      .from("artist_job_applications")
      .select("id", { count: "exact", head: true })
      .eq("applicant_id", user.id),
    supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("applicant_id", user.id),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", user.id)
      .in("status", ["issued", "active", "transferred"]),
    supabase
      .from("conversations")
      .select("id, last_message:messages!last_message_id(sender_id)")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
    supabase
      .from("employment_assignments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["invited", "confirmed", "active"]),
    supabase
      .from("profiles")
      .select("full_name, username, bio, avatar_url, location")
      .eq("id", user.id)
      .maybeSingle(),
  ])

  const applicationSources = [
    result("applications", artistApplicationsResponse),
    result("applications", staffingApplicationsResponse),
  ]
  const applicationsUnavailable = applicationSources.every(
    (source) => source.state === "unavailable",
  )
  const applications: SourceResult = {
    source: "applications",
    state: applicationsUnavailable ? "unavailable" : "ready",
    count: applicationsUnavailable
      ? null
      : applicationSources.reduce((total, source) => total + (source.count ?? 0), 0),
  }
  const tickets = result("tickets", ticketsResponse)
  let messages: SourceResult
  if (messagesResponse.error) {
    console.error(
      "[dashboard/action-center] messages unavailable",
      messagesResponse.error.message,
    )
    messages = { source: "messages", count: null, state: "unavailable" }
  } else {
    const count = (messagesResponse.data ?? []).reduce((total, conversation) => {
      const raw = conversation.last_message
      const lastMessage = Array.isArray(raw) ? raw[0] : raw
      return lastMessage?.sender_id && lastMessage.sender_id !== user.id
        ? total + 1
        : total
    }, 0)
    messages = { source: "messages", count, state: "ready" }
  }
  const assignments = result("assignments", assignmentsResponse)

  let profile: SourceResult
  if (profileResponse.error || !profileResponse.data) {
    if (profileResponse.error) {
      console.error(
        "[dashboard/action-center] profile unavailable",
        profileResponse.error.message,
      )
    }
    profile = { source: "profile", count: null, state: "unavailable" }
  } else {
    const row = profileResponse.data
    const summary: GeneralProfileSummary = {
      fullName: row.full_name,
      username: row.username,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      location: row.location,
    }
    profile = { source: "profile", count: profileCompletion(summary), state: "ready" }
  }

  const sources = { applications, tickets, messages, assignments, profile }
  const items: GeneralActionItem[] = [
    {
      id: "assignments",
      label: "Assignments",
      description:
        assignments.state === "ready"
          ? assignments.count
            ? "Review invitations and open your active Work Mode assignment."
            : "Accepted shifts and assignments will appear here."
          : "Assignments are temporarily unavailable.",
      href: "/work/today",
      count: assignments.count,
      state: assignments.state,
      priority: assignments.count ? "now" : "complete",
    },
    {
      id: "applications",
      label: "Applications",
      description:
        applications.state === "ready"
          ? applications.count
            ? "Track employer decisions and onboarding requests."
            : "Browse roles and submit your first application."
          : "Applications are temporarily unavailable.",
      href: applications.count ? "/jobs/my-applications" : "/jobs",
      count: applications.count,
      state: applications.state,
      priority: applications.count ? "soon" : "complete",
    },
    {
      id: "messages",
      label: "Messages",
      description:
        messages.state === "ready"
          ? messages.count
            ? "You have unread updates that may need a response."
            : "You are caught up on notifications."
          : "Message status is temporarily unavailable.",
      href: "/messages",
      count: messages.count,
      state: messages.state,
      priority: messages.count ? "now" : "complete",
    },
    {
      id: "tickets",
      label: "Tickets",
      description:
        tickets.state === "ready"
          ? tickets.count
            ? "Open your active event tickets."
            : "Purchased and transferred tickets will appear here."
          : "Tickets are temporarily unavailable.",
      href: "/tickets/my-tickets",
      count: tickets.count,
      state: tickets.state,
      priority: "complete",
    },
    {
      id: "profile",
      label: "Profile",
      description:
        profile.state === "ready"
          ? profile.count === 100
            ? "Your core public profile is complete."
            : "Add the missing basics employers and collaborators need."
          : "Profile completion is temporarily unavailable.",
      href: "/settings/profile",
      count: profile.count,
      state: profile.state,
      priority: profile.count !== null && profile.count < 100 ? "soon" : "complete",
    },
  ]

  const payload: GeneralActionCenterPayload = {
    items,
    generatedAt: new Date().toISOString(),
    partial: Object.values(sources).some((source) => source.state === "unavailable"),
  }

  return NextResponse.json(
    { data: payload },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
