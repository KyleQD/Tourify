import { describe, expect, it } from "vitest"

import { normalizeEventSetupFields } from "@/lib/admin/event-setup-fields"

describe("EVENT-102 event setup field normalization", () => {
  it("maps venue, promoter, times, capacity, age, and ownership to typed destinations", () => {
    const result = normalizeEventSetupFields({
      raw: {
        timezone: "America/Los_Angeles",
        capacity: "2500",
        age_restriction: "18+",
        venue_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        venue_name: "Forum",
        venue_address: "1 Forum Way",
        venue_room: "Main",
        venue_contact_name: "Alex",
        venue_contact_email: "alex@venue.test",
        venue_contact_phone: "+15551212",
        doors_open: "19:00",
        curfew: "23:00",
        load_in_time: "14:00",
        sound_check_time: "16:30",
        promoter_contact: {
          name: "Pat Promoter",
          email: "pat@promo.test",
          phone: "+15550000",
          company: "Promo Co",
        },
        ops_owner_user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        department_owner: "production",
      },
      createdBy: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      bridgedVenueId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    })

    expect(result.columns).toEqual({
      timezone: "America/Los_Angeles",
      capacity: 2500,
      age_restrictions: "18+",
    })
    expect(result.venueRelation.venues_v2_id).toBe("dddddddd-dddd-4ddd-8ddd-dddddddddddd")
    expect(result.venueRelation.venue_account_id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    expect(result.productionWindows).toMatchObject({
      load_in: "14:00",
      sound_check: "16:30",
      doors_open: "19:00",
      curfew: "23:00",
    })
    expect(result.promoterContact?.email).toBe("pat@promo.test")
    expect(result.ownership.ops_owner_user_id).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
    expect(result.settingsPatch.setup).toMatchObject({
      timezone: "America/Los_Angeles",
      capacity: 2500,
      age_restrictions: "18+",
    })
  })

  it("rejects invalid local times instead of silently dropping them", () => {
    expect(() =>
      normalizeEventSetupFields({
        raw: { doors_open: "25:99" },
        createdBy: null,
      }),
    ).toThrow(/doors_open must be HH:mm/)
  })
})
