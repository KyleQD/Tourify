import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

vi.mock("@/app/api/events/_lib/admin-event-persistence", () => ({
  resolveAdminOrgIdForUser: vi.fn(async () => "org-1"),
}))

vi.mock("@/app/api/events/_lib/events-v2-admin", () => ({
  buildUniqueEventSlug: vi.fn(async () => "promoted-show"),
}))

import {
  canNonOwnerViewArtistEvent,
  getArtistEventVisibility,
  isArtistEventDiscoverable,
  visibilityToIsPublic,
} from "@/lib/artist/artist-event-visibility"
import {
  buildArtistEventProducerPayload,
  hydrateArtistEventProducerForm,
} from "@/lib/artist/event-producer-builder"
import { ArtistEventOperationsService } from "@/lib/artist/artist-event-operations.service"
import { ArtistEventPromoteService } from "@/lib/artist/artist-event-promote.service"

describe("artist event visibility", () => {
  it("defaults to public and maps is_public", () => {
    expect(getArtistEventVisibility({})).toBe("public")
    expect(getArtistEventVisibility({ is_public: false })).toBe("private")
    expect(visibilityToIsPublic("unlisted")).toBe(true)
    expect(visibilityToIsPublic("private")).toBe(false)
  })

  it("excludes private and unlisted from discover", () => {
    expect(
      isArtistEventDiscoverable({
        status: "published",
        producer_settings: { visibility: "public" },
      }),
    ).toBe(true)
    expect(
      isArtistEventDiscoverable({
        status: "published",
        producer_settings: { visibility: "unlisted" },
      }),
    ).toBe(false)
    expect(
      isArtistEventDiscoverable({
        status: "published",
        producer_settings: { visibility: "private" },
      }),
    ).toBe(false)
    expect(
      isArtistEventDiscoverable({
        status: "draft",
        producer_settings: { visibility: "public" },
      }),
    ).toBe(false)
  })

  it("allows non-owners for public/unlisted published only", () => {
    expect(
      canNonOwnerViewArtistEvent({
        status: "published",
        producer_settings: { visibility: "unlisted" },
      }),
    ).toBe(true)
    expect(
      canNonOwnerViewArtistEvent({
        status: "published",
        producer_settings: { visibility: "private" },
      }),
    ).toBe(false)
    expect(
      canNonOwnerViewArtistEvent({
        status: "draft",
        producer_settings: { visibility: "public" },
      }),
    ).toBe(false)
  })
})

describe("artist event producer visibility hydrate round-trip", () => {
  it("preserves visibility and ticket fields", () => {
    const form = hydrateArtistEventProducerForm({
      title: "Night Show",
      status: "published",
      event_date: "2026-12-01",
      ticket_url: "https://tickets.example/night",
      ticket_price_min: 20,
      ticket_price_max: 40,
      producer_settings: {
        visibility: "unlisted",
        share_blurb: "Link only",
        marketing_notes: "Soft launch",
      },
    })

    expect(form.visibility).toBe("unlisted")
    expect(form.ticketUrl).toContain("tickets.example")
    expect(form.ticketPriceMin).toBe("20")
    expect(form.shareBlurb).toBe("Link only")

    const payload = buildArtistEventProducerPayload(form)
    expect(payload.producer_settings.visibility).toBe("unlisted")
    expect(payload.ticket_url).toContain("tickets.example")
    expect(payload.ticket_price_min).toBe(20)
    expect(payload.status).toBe("published")
  })
})

function createPublishMockSupabase(args: {
  event: Record<string, unknown>
  existingPosts?: Array<{ id: string; metadata: Record<string, unknown> }>
}) {
  const inserts: any[] = []
  const updates: any[] = []

  const supabase = {
    from(table: string) {
      if (table === "events") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: args.event, error: null }),
                  single: async () => ({ data: args.event, error: null }),
                }
              },
            }
          },
          update(payload: Record<string, unknown>) {
            updates.push(payload)
            return {
              eq() {
                return {
                  eq() {
                    return {
                      select() {
                        return {
                          single: async () => ({
                            data: { ...args.event, ...payload },
                            error: null,
                          }),
                        }
                      },
                    }
                  },
                }
              },
            }
          },
        }
      }

      if (table === "posts") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      limit: async () => ({
                        data: args.existingPosts || [],
                        error: null,
                      }),
                    }
                  },
                }
              },
            }
          },
          insert(payload: Record<string, unknown>) {
            inserts.push(payload)
            return Promise.resolve({ error: null })
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
    _inserts: inserts,
    _updates: updates,
  }

  return supabase
}

describe("artist event publish idempotency", () => {
  it("creates a feed post on first publish", async () => {
    const event = {
      id: "evt-1",
      artist_id: "user-1",
      created_by: "user-1",
      title: "First Night",
      name: "First Night",
      status: "draft",
      event_date: "2026-08-01",
      venue_name: "The Echo",
      city: "LA",
      slug: "first-night",
      producer_settings: { visibility: "public" },
    }
    const supabase = createPublishMockSupabase({ event })

    const published = await ArtistEventOperationsService.publishEvent({
      supabase,
      userId: "user-1",
      eventId: "evt-1",
    })

    expect(published.status).toBe("published")
    expect(supabase._inserts).toHaveLength(1)
    expect(supabase._inserts[0].metadata.event_id).toBe("evt-1")
  })

  it("skips duplicate feed posts when already published with existing post", async () => {
    const event = {
      id: "evt-1",
      artist_id: "user-1",
      created_by: "user-1",
      title: "First Night",
      name: "First Night",
      status: "published",
      event_date: "2026-08-01",
      venue_name: "The Echo",
      city: "LA",
      slug: "first-night",
      producer_settings: { visibility: "public" },
    }
    const supabase = createPublishMockSupabase({
      event,
      existingPosts: [{ id: "post-1", metadata: { event_id: "evt-1" } }],
    })

    await ArtistEventOperationsService.publishEvent({
      supabase,
      userId: "user-1",
      eventId: "evt-1",
    })

    expect(supabase._inserts).toHaveLength(0)
  })

  it("skips feed post when metadata already references event_id", async () => {
    const event = {
      id: "evt-2",
      artist_id: "user-1",
      created_by: "user-1",
      title: "Second Night",
      name: "Second Night",
      status: "draft",
      event_date: "2026-08-02",
      venue_name: "Venue",
      city: "NYC",
      slug: "second-night",
      producer_settings: { visibility: "public" },
    }
    const supabase = createPublishMockSupabase({
      event,
      existingPosts: [{ id: "post-2", metadata: { event_id: "evt-2" } }],
    })

    await ArtistEventOperationsService.publishEvent({
      supabase,
      userId: "user-1",
      eventId: "evt-2",
    })

    expect(supabase._inserts).toHaveLength(0)
  })
})

describe("artist event promote already-promoted path", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
  })

  it("returns alreadyPromoted without throwing", async () => {
    const event = {
      id: "evt-1",
      artist_id: "user-1",
      created_by: "user-1",
      title: "Promoted Show",
      name: "Promoted Show",
      status: "published",
      event_date: "2026-09-01",
      venue_name: "Hall",
      city: "Austin",
      promoted_event_v2_id: "v2-1",
      producer_settings: { promoted_org_id: "org-fallback" },
    }

    const userSupabase = {
      from(table: string) {
        if (table !== "events") throw new Error(`Unexpected ${table}`)
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: event, error: null }),
                }
              },
            }
          },
        }
      },
    }

    const { createClient } = await import("@supabase/supabase-js")
    vi.mocked(createClient).mockReturnValue({
      from(table: string) {
        if (table === "events_v2") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { id: "v2-1", org_id: "org-1" },
                      error: null,
                    }),
                  }
                },
              }
            },
          }
        }
        throw new Error(`Unexpected service table ${table}`)
      },
    } as any)

    const result = await ArtistEventPromoteService.promoteEvent({
      supabase: userSupabase,
      userId: "user-1",
      eventId: "evt-1",
    })

    expect(result.alreadyPromoted).toBe(true)
    expect(result.events_v2_id).toBe("v2-1")
    expect(result.org_id).toBe("org-1")
  })
})
