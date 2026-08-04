import { NextResponse } from "next/server"
import { z } from "zod"

import {
  parseFinanceScopeKinds,
  searchFinanceScope,
} from "@/lib/admin/finance-scope-search"
import { withAdminCapability } from "@/lib/auth/api-auth"

const querySchema = z.object({
  q: z.string().max(120).optional().default(""),
  kinds: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(40).optional().default(12),
})

/**
 * FIN-104 — Org-scoped finance entity search for picker UX.
 * Replaces raw UUID entry; writes still validate parents via FIN-103.
 */
export const GET = withAdminCapability("finance.view", async (request, { supabase, admin }) => {
  try {
    const input = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const result = await searchFinanceScope({
      supabase,
      orgId: admin.orgId,
      query: input.q,
      kinds: parseFinanceScopeKinds(input.kinds),
      limit: input.limit,
    })
    return NextResponse.json({
      success: true,
      orgId: admin.orgId,
      ...result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", code: "validation_error", details: error.errors },
        { status: 400 },
      )
    }
    console.error("[Admin Finances scope-search] GET failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
