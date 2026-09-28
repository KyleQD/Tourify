import { describe, expect, it } from 'vitest'

import {
  isMissingSiteMapEventV2Column,
  normalizeLegacySiteMapEventScope,
} from '@/lib/site-map/schema-compat'

describe('site-map schema compatibility', () => {
  it('recognizes only the site_maps event_v2_id schema-cache failure', () => {
    expect(isMissingSiteMapEventV2Column({
      code: 'PGRST204',
      message: "Could not find the 'event_v2_id' column of 'site_maps' in the schema cache",
    })).toBe(true)
    expect(isMissingSiteMapEventV2Column({
      code: '42703',
      message: 'column site_maps.event_v2_id does not exist',
    })).toBe(true)

    expect(isMissingSiteMapEventV2Column({
      code: 'PGRST204',
      message: "Could not find the 'event_v2_id' column of 'other_table' in the schema cache",
    })).toBe(false)
    expect(isMissingSiteMapEventV2Column({
      message: 'permission denied for table site_maps',
    })).toBe(false)
  })

  it('normalizes the deployed event_id response to the canonical client shape', () => {
    expect(normalizeLegacySiteMapEventScope({
      id: 'map-a',
      event_id: 'event-a',
      tour_id: null,
    })).toEqual({
      id: 'map-a',
      event_id: 'event-a',
      event_v2_id: 'event-a',
      tour_id: null,
    })
  })
})
