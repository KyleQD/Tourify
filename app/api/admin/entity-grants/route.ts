import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  assertExternalCannotEnumerateOrg,
  buildEntityGrantInsert,
  ENTITY_GRANT_GRANTEE_TYPES,
  ENTITY_GRANT_RESOURCE_TYPES,
  EntityGrantAccessError,
  EntityGrantValidationError,
  filterEnumerableResourcesForGrantee,
  isEntityGrantActive,
  mapEntityGrantRow,
} from "@/lib/admin/entity-grants"
import { withAdminCapability } from "@/lib/auth/api-auth"

const createGrantSchema = z.object({
  grantee_type: z.enum(ENTITY_GRANT_GRANTEE_TYPES),
  grantee_user_id: z.string().uuid().optional().nullable(),
  grantee_venue_id: z.string().uuid().optional().nullable(),
  grantee_vendor_id: z.string().uuid().optional().nullable(),
  grantee_email: z.string().email().optional().nullable(),
  resource_type: z.enum(ENTITY_GRANT_RESOURCE_TYPES),
  resource_id: z.string().uuid(),
  capabilities: z.array(z.string()).min(1),
  protected_data_classes: z.array(z.string()).optional(),
  expires_at: z.string().min(1),
  reason: z.string().max(500).optional().nullable(),
})

const revokeSchema = z.object({
  id: z.string().uuid(),
})

/**
 * SEC-204 — Manage delegated entity grants (org admins).
 * External principals never receive org catalog listings from this route.
 */
export const GET = withAdminCapability("org.roles.manage", async (request, { supabase, admin }) => {
  try {
    const { searchParams } = new URL(request.url)
    const resourceType = searchParams.get("resource_type")
    const resourceId = searchParams.get("resource_id")
    const granteeUserId = searchParams.get("grantee_user_id")
    const includeExpired = searchParams.get("include_expired") === "true"

    // Org members with org.roles.manage may list grants for their org only.
    let query = supabase
      .from("entity_grants")
      .select("*")
      .eq("org_id", admin.orgId)
      .order("created_at", { ascending: false })
      .limit(200)

    if (resourceType) query = query.eq("resource_type", resourceType)
    if (resourceId) query = query.eq("resource_id", resourceId)
    if (granteeUserId) query = query.eq("grantee_user_id", granteeUserId)
    if (!includeExpired) query = query.eq("status", "active")

    const { data, error } = await query
    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({
          success: true,
          grants: [],
          needsMigration: true,
        })
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 503 })
    }

    const now = Date.now()
    const grants = ((data || []) as Record<string, unknown>[])
      .map(mapEntityGrantRow)
      .filter((grant) => includeExpired || isEntityGrantActive(grant, now))

    return NextResponse.json({ success: true, grants })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list entity grants"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})

export const POST = withAdminCapability("org.roles.manage", async (request, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = createGrantSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const input = parsed.data
    const row = buildEntityGrantInsert({
      orgId: admin.orgId,
      actorUserId: user.id,
      granteeType: input.grantee_type,
      granteeUserId: input.grantee_user_id,
      granteeVenueId: input.grantee_venue_id,
      granteeVendorId: input.grantee_vendor_id,
      granteeEmail: input.grantee_email,
      resourceType: input.resource_type,
      resourceId: input.resource_id,
      capabilities: input.capabilities as never,
      protectedDataClasses: input.protected_data_classes as never,
      expiresAt: input.expires_at,
      reason: input.reason,
    })

    const { data, error } = await supabase
      .from("entity_grants")
      .insert(row)
      .select("*")
      .single()

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          { success: false, error: "entity_grants migration required", needsMigration: true },
          { status: 503 },
        )
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 503 })
    }

    return NextResponse.json(
      { success: true, grant: mapEntityGrantRow(data as Record<string, unknown>) },
      { status: 201 },
    )
  } catch (error: unknown) {
    if (error instanceof EntityGrantValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      )
    }
    const message = error instanceof Error ? error.message : "Failed to create entity grant"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})

export const DELETE = withAdminCapability("org.roles.manage", async (request, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    const parsed = revokeSchema.safeParse({
      id: url.searchParams.get("id") || body.id,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Grant id is required" },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("entity_grants")
      .update({
        status: "revoked",
        revoked_at: now,
        revoked_by: user.id,
        updated_at: now,
      })
      .eq("id", parsed.data.id)
      .eq("org_id", admin.orgId)
      .select("*")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 })
    }
    if (!data) {
      return NextResponse.json({ success: false, error: "Grant not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      grant: mapEntityGrantRow(data as Record<string, unknown>),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to revoke entity grant"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})

/** Helper for internal resolve paths. */
function resolveGrantedResourceIds(args: {
  isOrgMember: boolean
  requestedIds: readonly string[]
  grants: ReturnType<typeof mapEntityGrantRow>[]
  resourceType: (typeof ENTITY_GRANT_RESOURCE_TYPES)[number]
}) {
  const enumeration = assertExternalCannotEnumerateOrg({
    isOrgMember: args.isOrgMember,
    listMode: args.requestedIds.length === 0 ? "org_catalog" : "granted_resources",
  })
  if (!enumeration.ok) {
    throw new EntityGrantAccessError(enumeration.message, enumeration.code, 403)
  }
  if (args.isOrgMember) return [...args.requestedIds]
  return filterEnumerableResourcesForGrantee({
    requestedResourceIds: args.requestedIds,
    grants: args.grants,
    resourceType: args.resourceType,
  })
}
