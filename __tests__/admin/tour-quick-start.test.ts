import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { hydrateEventProducerForm } from "@/lib/admin/event-producer-builder"
import {
  buildTourCollaborationInviteNotification,
  createInvitationToken,
  hashInvitationToken,
  invitationDeliveryErrorMessage,
  invitationIdentityMatches,
} from "@/lib/admin/tour-collaboration-invitations"
import {
  formatSafeDate,
  isUpcomingAdminEvent,
  normalizeAdminEvent,
} from "@/lib/events/admin-event-normalization"

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260731184645_streamlined_tour_builder_quick_start.sql",
  ),
  "utf8",
)
const rlsRepairMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260731194500_quick_start_event_rpc_rls_repair.sql",
  ),
  "utf8",
)

describe("streamlined tour quick-start migration", () => {
  it("creates idempotent unscheduled event batches with bounded ordinals", () => {
    expect(migration).toContain("create_tour_quick_start_events")
    expect(migration).toContain("p_count < 1 or p_count > 50")
    expect(migration).toContain("events_v2_quick_start_batch_ordinal_key")
    expect(migration).toContain("Idempotency key was already used with different input")
    expect(migration).toContain("start_at is null")
    expect(migration).toContain("status = 'inquiry'")
    expect(rlsRepairMigration).toContain(
      "alter function private.create_tour_quick_start_events(uuid, integer, uuid)\n  security definer",
    )
    expect(rlsRepairMigration).toMatch(
      /create or replace function public\.create_tour_quick_start_events[\s\S]*?security invoker/,
    )
  })

  it("stores hashed, expiring, tour-only collaboration invitations", () => {
    expect(migration).toContain("create table if not exists public.tour_collaboration_invitations")
    expect(migration).toContain("token_hash text not null unique")
    expect(migration).toContain("now() + interval '7 days'")
    expect(migration).toContain("accept_tour_collaboration_invitation")
    expect(migration).toMatch(
      /create or replace function public\.accept_tour_collaboration_invitation[\s\S]*?security invoker/,
    )
    expect(migration).toMatch(
      /create or replace function private\.accept_tour_collaboration_invitation[\s\S]*?security definer/,
    )
    expect(migration).toContain("pg_advisory_xact_lock")
    expect(migration).toContain("private.can_manage_tour")
    expect(migration).not.toContain("organization_members")
  })
})

describe("quick-start event presentation", () => {
  const draft = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Internal Tour Name — Event 1",
    status: "inquiry",
    start_at: null,
    end_at: null,
    settings: {
      quick_start_placeholder: true,
      quick_start_label: "Event 1",
    },
  }

  it("shows placeholder labels and TBD schedule data", () => {
    const normalized = normalizeAdminEvent(draft)

    expect(normalized.name).toBe("Event 1")
    expect(normalized.event_date).toBe("")
    expect(normalized.is_quick_start_placeholder).toBe(true)
    expect(formatSafeDate(normalized.event_date)).toBe("TBD")
    expect(isUpcomingAdminEvent(normalized)).toBe(false)
  })

  it("hydrates the existing draft with blank planning fields", () => {
    const form = hydrateEventProducerForm(draft)

    expect(form.title).toBe("")
    expect(form.date).toBe("")
    expect(form.primaryTourId).toBe("")
  })
})

describe("tour collaboration invitation tokens", () => {
  it("returns a random raw token while persisting only its SHA-256 representation", () => {
    const invitation = createInvitationToken()

    expect(invitation.token).not.toBe(invitation.tokenHash)
    expect(invitation.tokenHash).toHaveLength(64)
    expect(hashInvitationToken(invitation.token)).toBe(invitation.tokenHash)
  })

  it("enforces intended user and identity-bound invitations", () => {
    const user = { id: "11111111-1111-4111-8111-111111111111", email: "tour@example.com" }

    expect(invitationIdentityMatches({
      invitation: { invited_user_id: user.id },
      user,
    })).toBe(true)
    expect(invitationIdentityMatches({
      invitation: { invited_email: "OTHER@example.com" },
      user,
    })).toBe(false)
    expect(invitationIdentityMatches({ invitation: {}, user })).toBe(true)
  })

  it("builds a recipient message with a supported notification type and join link", () => {
    const notification = buildTourCollaborationInviteNotification({
      invitationId: "33333333-3333-4333-8333-333333333333",
      inviteUrl: "https://tourify.test/tours/invite/token",
      inviterUserId: "11111111-1111-4111-8111-111111111111",
      recipientUserId: "22222222-2222-4222-8222-222222222222",
      tourId: "44444444-4444-4444-8444-444444444444",
      tourName: "Summer Run",
      expiresAt: "2026-08-07T19:00:00.000Z",
    })

    expect(notification).toMatchObject({
      userId: "22222222-2222-4222-8222-222222222222",
      type: "collaboration_invite",
      relatedUserId: "11111111-1111-4111-8111-111111111111",
      metadata: {
        link: "https://tourify.test/tours/invite/token",
        actionLabel: "Review invitation",
      },
    })
  })

  it("preserves structured delivery errors for actionable diagnostics", () => {
    expect(invitationDeliveryErrorMessage({ message: "notification type rejected" })).toBe(
      "notification type rejected",
    )
  })
})
