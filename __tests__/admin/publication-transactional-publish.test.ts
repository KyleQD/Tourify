import { describe, expect, it } from "vitest"

import {
  assembleTransactionalPublish,
  buildDefaultTourAudienceCandidates,
  buildDefaultTourBookSections,
  buildPublicationCommitIdempotencyKey,
  TransactionalPublishValidationError,
} from "@/lib/admin/publication-transactional-publish"

describe("PUB-204 transactional publish assembly", () => {
  it("builds deterministic tour-book sections and audience deliveries", () => {
    const sections = buildDefaultTourBookSections({
      tour: {
        id: "tour-1",
        name: "Summer Run",
        start_date: "2026-08-01",
        end_date: "2026-08-10",
        settings: {
          main_artist: "Nova",
          crew: [{ userId: "user-2", name: "Alex", role: "TM" }],
        },
      },
      stops: [
        {
          ordinal: 0,
          name: "Opening",
          local_date: "2026-08-01",
          venue_label: "Hall",
          event_id: "evt-1",
        },
      ],
    })

    const candidates = buildDefaultTourAudienceCandidates({
      publisherUserId: "user-1",
      settings: {
        crew: [{ userId: "user-2", name: "Alex", role: "TM" }],
      },
    })

    const assembly = assembleTransactionalPublish({
      publicationType: "tour_book",
      orgId: "org-1",
      subjectType: "tour",
      subjectId: "tour-1",
      title: "Tour book: Summer Run",
      sourcePlanVersion: 3,
      sections,
      candidates,
      lifecycleTourId: "tour-1",
    })

    expect(assembly.render.ok).toBe(true)
    expect(assembly.snapshot.checksum).toHaveLength(64)
    expect(assembly.sections.map((row) => row.section_key)).toEqual(["contacts", "itinerary", "overview"])
    expect(assembly.audience.recipient_count).toBe(2)
    expect(assembly.deliveries.length).toBeGreaterThan(0)
    expect(assembly.lifecycle).toEqual({ tour_id: "tour-1", set_status: "active" })
  })

  it("rejects missing required sections instead of silent omit", () => {
    expect(() =>
      assembleTransactionalPublish({
        publicationType: "itinerary",
        orgId: "org-1",
        subjectType: "tour",
        subjectId: "tour-1",
        title: "Itinerary",
        sourcePlanVersion: 1,
        sections: [
          {
            key: "itinerary",
            title: "Itinerary",
            required: true,
            payload: null,
          },
        ],
        candidates: [
          {
            subjectType: "user",
            subjectId: "u1",
            displayName: "Pat",
            source: "test",
            audienceClass: "worker",
            channels: ["in_app"],
            protectedFields: [],
          },
        ],
      }),
    ).toThrow(TransactionalPublishValidationError)
  })

  it("builds stable commit idempotency keys", () => {
    const key = buildPublicationCommitIdempotencyKey({
      orgId: "org-1",
      publicationType: "tour_book",
      subjectType: "tour",
      subjectId: "tour-1",
      naturalKey: "plan:2",
    })
    expect(key).toBe("pub.commit:org-1:tour_book:tour:tour-1:plan:2")
  })

  it("packages excluded recipients without delivery rows", () => {
    const assembly = assembleTransactionalPublish({
      publicationType: "day_sheet",
      orgId: "org-1",
      subjectType: "event",
      subjectId: "11111111-1111-4111-8111-111111111111",
      title: "Day sheet",
      sourcePlanVersion: 1,
      sections: [
        {
          key: "overview",
          title: "Overview",
          required: true,
          payload: { eventId: "11111111-1111-4111-8111-111111111111" },
        },
      ],
      candidates: [
        {
          subjectType: "user",
          subjectId: "in",
          displayName: "In",
          source: "roster",
          audienceClass: "worker",
          channels: ["in_app"],
          protectedFields: [],
        },
        {
          subjectType: "user",
          subjectId: "out",
          displayName: "Out",
          source: "roster",
          audienceClass: "worker",
          channels: ["in_app"],
          protectedFields: [],
          excluded: true,
          excludeReason: "policy",
        },
      ],
    })

    expect(assembly.audience.excluded_count).toBe(1)
    expect(assembly.deliveries.every((row) => row.subject_key === "in")).toBe(true)
    expect(assembly.recipients.some((row) => row.exclusion_reason === "policy")).toBe(true)
  })
})
