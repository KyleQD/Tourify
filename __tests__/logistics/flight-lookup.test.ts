import { describe, expect, it, vi } from 'vitest'
import { lookupFlightByNumber, toFlightFormTimes } from '@/lib/logistics/flight-lookup'

describe('lookupFlightByNumber', () => {
  it('returns missing_key when AVIATIONSTACK_API_KEY is unset', async () => {
    const prev = process.env.AVIATIONSTACK_API_KEY
    delete process.env.AVIATIONSTACK_API_KEY
    const result = await lookupFlightByNumber({ flightNumber: 'UA100' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('missing_key')
    if (prev !== undefined) process.env.AVIATIONSTACK_API_KEY = prev
  })

  it('maps aviationstack payload into form-ready flight fields', async () => {
    process.env.AVIATIONSTACK_API_KEY = 'test-key'
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            flight_status: 'scheduled',
            departure: {
              iata: 'SFO',
              scheduled: '2026-07-20T15:30:00+00:00',
              gate: 'A1',
              terminal: '2',
            },
            arrival: {
              iata: 'LAX',
              scheduled: '2026-07-20T17:00:00+00:00',
            },
            airline: { name: 'United Airlines', iata: 'UA' },
            flight: { number: '100', iata: 'UA100' },
          },
        ],
      }),
    })) as unknown as typeof fetch

    const result = await lookupFlightByNumber({
      flightNumber: 'UA100',
      flightDate: '2026-07-20',
      fetchImpl,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.flight.airline).toBe('United Airlines')
    expect(result.flight.flight_number).toBe('UA100')
    expect(result.flight.departure_airport).toBe('SFO')
    expect(result.flight.arrival_airport).toBe('LAX')
    const formTimes = toFlightFormTimes(result.flight)
    expect(formTimes.departure_time).toContain('T')
    expect(formTimes.arrival_time).toContain('T')
  })
})
