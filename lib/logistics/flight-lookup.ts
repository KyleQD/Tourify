/**
 * AviationStack flight schedule lookup adapter.
 * Server-only — never expose AVIATIONSTACK_API_KEY to the client.
 */

export interface FlightLookupResult {
  airline: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_time: string
  arrival_time: string
  status: string
  gate?: string | null
  terminal?: string | null
  source: 'aviationstack'
}

export interface FlightLookupError {
  code: 'missing_key' | 'not_found' | 'upstream' | 'invalid_input'
  message: string
}

export type FlightLookupResponse =
  | { ok: true; flight: FlightLookupResult; alternatives?: FlightLookupResult[] }
  | { ok: false; error: FlightLookupError }

interface AviationStackFlight {
  flight_date?: string
  flight_status?: string
  departure?: {
    airport?: string
    iata?: string
    icao?: string
    scheduled?: string
    estimated?: string
    actual?: string
    terminal?: string
    gate?: string
  }
  arrival?: {
    airport?: string
    iata?: string
    icao?: string
    scheduled?: string
    estimated?: string
    actual?: string
    terminal?: string
    gate?: string
  }
  airline?: {
    name?: string
    iata?: string
    icao?: string
  }
  flight?: {
    number?: string
    iata?: string
    icao?: string
  }
}

function normalizeStatus(raw?: string): string {
  const value = (raw || '').toLowerCase()
  if (value === 'cancelled' || value === 'canceled') return 'cancelled'
  if (value === 'delayed') return 'delayed'
  if (value === 'active' || value === 'en-route' || value === 'enroute') return 'in_flight'
  if (value === 'landed') return 'landed'
  if (value === 'scheduled') return 'scheduled'
  return 'scheduled'
}

function toLocalDatetimeInput(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function mapFlight(row: AviationStackFlight): FlightLookupResult | null {
  const flightNumber =
    row.flight?.iata ||
    (row.airline?.iata && row.flight?.number
      ? `${row.airline.iata}${row.flight.number}`
      : row.flight?.number) ||
    ''
  const departureAirport = row.departure?.iata || row.departure?.icao || ''
  const arrivalAirport = row.arrival?.iata || row.arrival?.icao || ''
  const departureTime =
    row.departure?.scheduled || row.departure?.estimated || row.departure?.actual || ''
  const arrivalTime =
    row.arrival?.scheduled || row.arrival?.estimated || row.arrival?.actual || ''

  if (!flightNumber || !departureAirport || !arrivalAirport || !departureTime || !arrivalTime)
    return null

  return {
    airline: row.airline?.name || row.airline?.iata || 'Unknown airline',
    flight_number: flightNumber.replace(/\s+/g, '').toUpperCase(),
    departure_airport: departureAirport.toUpperCase(),
    arrival_airport: arrivalAirport.toUpperCase(),
    departure_time: departureTime,
    arrival_time: arrivalTime,
    status: normalizeStatus(row.flight_status),
    gate: row.departure?.gate || null,
    terminal: row.departure?.terminal || null,
    source: 'aviationstack',
  }
}

/** Convert API ISO times to datetime-local values for admin forms. */
export function toFlightFormTimes(flight: FlightLookupResult): {
  departure_time: string
  arrival_time: string
} {
  return {
    departure_time: toLocalDatetimeInput(flight.departure_time),
    arrival_time: toLocalDatetimeInput(flight.arrival_time),
  }
}

export async function lookupFlightByNumber(args: {
  flightNumber: string
  flightDate?: string | null
  fetchImpl?: typeof fetch
}): Promise<FlightLookupResponse> {
  const flightNumber = args.flightNumber.trim().replace(/\s+/g, '').toUpperCase()
  if (!flightNumber || flightNumber.length < 2) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: 'Enter a valid flight number (e.g. UA123).' },
    }
  }

  const apiKey = process.env.AVIATIONSTACK_API_KEY?.trim()
  if (!apiKey) {
    return {
      ok: false,
      error: {
        code: 'missing_key',
        message: 'Flight lookup is unavailable. Set AVIATIONSTACK_API_KEY or enter details manually.',
      },
    }
  }

  const params = new URLSearchParams({
    access_key: apiKey,
    flight_iata: flightNumber,
    limit: '5',
  })
  if (args.flightDate) params.set('flight_date', args.flightDate)

  const fetchImpl = args.fetchImpl || fetch
  let response: Response
  try {
    response = await fetchImpl(`https://api.aviationstack.com/v1/flights?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: 'upstream',
        message: error?.message || 'Flight lookup request failed.',
      },
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: 'upstream',
        message: `Flight lookup provider returned ${response.status}.`,
      },
    }
  }

  const payload = await response.json().catch(() => null) as {
    data?: AviationStackFlight[]
    error?: { message?: string }
  } | null

  if (payload?.error?.message) {
    return {
      ok: false,
      error: { code: 'upstream', message: payload.error.message },
    }
  }

  const mapped = (payload?.data || [])
    .map(mapFlight)
    .filter((row): row is FlightLookupResult => Boolean(row))

  if (mapped.length === 0) {
    return {
      ok: false,
      error: {
        code: 'not_found',
        message: `No schedule found for ${flightNumber}${args.flightDate ? ` on ${args.flightDate}` : ''}.`,
      },
    }
  }

  return {
    ok: true,
    flight: mapped[0],
    alternatives: mapped.slice(1),
  }
}
