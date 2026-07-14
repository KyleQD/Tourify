import { NextResponse, type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { resolveHiringEntity } from "@/lib/auth/acting-context"
import type { HiringActor, HiringEntityType } from "@/types/hiring-entity"
import type { HiringServiceError, HiringServiceResult } from "@/types/hiring-service"
import { fail, ok } from "@/types/hiring-service"

export interface JsonBody {
  [key: string]: unknown
}

export interface HiringRouteContext {
  actor: HiringActor
  body?: JsonBody
}

interface ResolveHiringActorArgs {
  request: NextRequest
  supabase: SupabaseClient
  body?: JsonBody
  requirePermission?: boolean
}

interface ReadJsonBodyArgs {
  request: NextRequest
  optional?: boolean
}

function getFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
  }

  return undefined
}

function normalizeEntityType(value: unknown): HiringEntityType | undefined {
  if (value === "venue" || value === "organization" || value === "artist") return value
  return undefined
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization")
  if (!authorization) return null

  const [scheme, token] = authorization.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) return null

  return token.trim()
}

export async function getAuthenticatedUserId({
  request,
  supabase,
}: {
  request: NextRequest
  supabase: SupabaseClient
}): Promise<HiringServiceResult<string>> {
  const auth = await authenticateApiRequest(request)
  if (auth?.user?.id) return ok(auth.user.id)

  const bearerToken = getBearerToken(request)
  if (bearerToken) {
    const { data, error } = await supabase.auth.getUser(bearerToken)
    if (!error && data.user?.id) return ok(data.user.id)
  }

  return fail({
    code: "UNAUTHORIZED",
    message: "Authentication required.",
  })
}

export async function readJsonBody({ request, optional = false }: ReadJsonBodyArgs): Promise<HiringServiceResult<JsonBody>> {
  try {
    const body = (await request.json()) as unknown
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      if (optional) return ok({})
      return fail({ code: "BAD_REQUEST", message: "Request body must be a JSON object." })
    }

    return ok(body as JsonBody)
  } catch (error) {
    if (optional) return ok({})
    return fail({ code: "BAD_REQUEST", message: "Request body is missing or invalid JSON.", details: error })
  }
}

export function getHiringScopeFromRequest({
  request,
  body,
}: {
  request: NextRequest
  body?: JsonBody
}): {
  entityType?: HiringEntityType
  entityId?: string
  venueId?: string
  eventId?: string
  tourId?: string
  displayName?: string
} {
  const params = request.nextUrl.searchParams

  return {
    entityType: normalizeEntityType(
      getFirstString(
        body?.entityType,
        body?.entity_type,
        body?.employerEntityType,
        body?.employer_entity_type,
        params.get("entity_type"),
        params.get("employer_entity_type")
      )
    ),
    entityId: getFirstString(
      body?.entityId,
      body?.entity_id,
      body?.employerEntityId,
      body?.employer_entity_id,
      params.get("entity_id"),
      params.get("employer_entity_id")
    ),
    venueId: getFirstString(body?.venueId, body?.venue_id, params.get("venue_id"), params.get("venueId")),
    eventId: getFirstString(body?.eventId, body?.event_id, params.get("event_id"), params.get("eventId")),
    tourId: getFirstString(body?.tourId, body?.tour_id, params.get("tour_id"), params.get("tourId")),
    displayName: getFirstString(body?.displayName, body?.display_name, params.get("display_name")),
  }
}

export async function resolveHiringActorFromRequest({
  request,
  supabase,
  body,
  requirePermission = true,
}: ResolveHiringActorArgs): Promise<HiringServiceResult<HiringActor>> {
  const userResult = await getAuthenticatedUserId({ request, supabase })
  if (!userResult.ok) return userResult

  const scope = getHiringScopeFromRequest({ request, body })
  const employerResult = await resolveHiringEntity({
    supabase,
    userId: userResult.data,
    entityType: scope.entityType,
    entityId: scope.entityId,
    venueId: scope.venueId,
    eventId: scope.eventId,
    tourId: scope.tourId,
    displayName: scope.displayName,
    requirePermission,
  })

  if (!employerResult.ok) return employerResult

  return ok({ userId: userResult.data, employer: employerResult.data })
}

function getHttpStatusForHiringError(error: HiringServiceError): number {
  switch (error.code) {
    case "BAD_REQUEST":
    case "VALIDATION_ERROR":
      return 400
    case "UNAUTHORIZED":
      return 401
    case "FORBIDDEN":
      return 403
    case "NOT_FOUND":
      return 404
    case "CONFLICT":
      return 409
    case "UNSUPPORTED":
      return 422
    case "DATABASE_ERROR":
    default:
      return 500
  }
}

export function hiringResultToResponse<TData>(result: HiringServiceResult<TData>, init?: ResponseInit): NextResponse {
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
        },
      },
      { status: getHttpStatusForHiringError(result.error), ...init }
    )
  }

  return NextResponse.json({ ok: true, data: result.data }, init)
}

export function routeErrorToResponse(error: unknown): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected hiring API route failure.",
        details: error instanceof Error ? error.message : error,
      },
    },
    { status: 500 }
  )
}

export function getPaginationFilters(request: NextRequest): { limit?: number; offset?: number } {
  const params = request.nextUrl.searchParams
  const limit = Number(params.get("limit") ?? undefined)
  const offset = Number(params.get("offset") ?? undefined)

  return {
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
  }
}

export function getListFiltersFromRequest(request: NextRequest): {
  status?: string
  jobPostingId?: string
  department?: string
  position?: string
  query?: string
  starredOnly?: boolean
  limit?: number
  offset?: number
} {
  const params = request.nextUrl.searchParams
  const starred = params.get("starred")

  return {
    status: params.get("status") ?? undefined,
    jobPostingId: params.get("job_id") ?? params.get("job_posting_id") ?? params.get("jobPostingId") ?? undefined,
    department: params.get("department") ?? undefined,
    position: params.get("position") ?? undefined,
    query: params.get("search") ?? params.get("q") ?? params.get("query") ?? undefined,
    starredOnly: starred === "true" || starred === "1",
    ...getPaginationFilters(request),
  }
}
