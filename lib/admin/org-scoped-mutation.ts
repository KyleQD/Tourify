/**
 * SEC-110 — Organization predicates on mutations.
 *
 * Update/delete always include target ID + acting org_id.
 * Child mutations validate the parent chain before mutating.
 */

export class OrgScopedMutationError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 422 | 503,
    public readonly code: string,
  ) {
    super(message)
    this.name = "OrgScopedMutationError"
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface OrgScopedMutationResult<T = Record<string, unknown>> {
  data: T | null
  error: { message: string } | null
}

/**
 * Update a row that carries org_id. Always predicates on id + org_id.
 * Returns null data when no row matched (wrong org / missing id).
 */
export async function orgScopedUpdate<T = Record<string, unknown>>(args: {
  supabase: SupabaseClient
  table: string
  id: string
  orgId: string
  patch: Record<string, unknown>
  select?: string
}): Promise<OrgScopedMutationResult<T>> {
  if (!args.id?.trim() || !args.orgId?.trim()) {
    throw new OrgScopedMutationError(
      "Target id and acting org_id are required for updates.",
      422,
      "mutation_scope_required",
    )
  }

  const { data, error } = await args.supabase
    .from(args.table)
    .update(args.patch)
    .eq("id", args.id)
    .eq("org_id", args.orgId)
    .select(args.select || "*")
    .maybeSingle()

  return { data: (data as T) || null, error: error || null }
}

/**
 * Delete a row that carries org_id. Always predicates on id + org_id.
 */
export async function orgScopedDelete(args: {
  supabase: SupabaseClient
  table: string
  id: string
  orgId: string
  select?: string
}): Promise<OrgScopedMutationResult<{ id: string }>> {
  if (!args.id?.trim() || !args.orgId?.trim()) {
    throw new OrgScopedMutationError(
      "Target id and acting org_id are required for deletes.",
      422,
      "mutation_scope_required",
    )
  }

  const { data, error } = await args.supabase
    .from(args.table)
    .delete()
    .eq("id", args.id)
    .eq("org_id", args.orgId)
    .select(args.select || "id")
    .maybeSingle()

  return { data: data || null, error: error || null }
}

export interface ParentChainSpec {
  /** Parent table that owns org_id (e.g. lodging_bookings). */
  parentTable: string
  parentId: string
  /** Child table / FK column linking to parent. */
  childTable: string
  childId: string
  parentFkColumn: string
}

/**
 * Validate child → parent → org in one logical transaction boundary.
 * Prefers the SEC-110 SQL RPC when available, then falls back to dual reads.
 */
export async function assertChildParentOrgChain(
  supabase: SupabaseClient,
  orgId: string,
  chain: ParentChainSpec,
): Promise<{ parentId: string; childId: string }> {
  if (!orgId?.trim() || !chain.parentId?.trim() || !chain.childId?.trim()) {
    throw new OrgScopedMutationError(
      "Parent id, child id, and acting org_id are required.",
      422,
      "mutation_scope_required",
    )
  }

  if (typeof supabase.rpc === "function") {
    const { error: rpcError } = await supabase.rpc("admin_assert_child_parent_org_chain", {
      p_org_id: orgId,
      p_parent_table: chain.parentTable,
      p_parent_id: chain.parentId,
      p_child_table: chain.childTable,
      p_child_id: chain.childId,
      p_parent_fk_column: chain.parentFkColumn,
    })
    if (!rpcError) {
      return { parentId: chain.parentId, childId: chain.childId }
    }
    // Undefined function / migration not applied → fall through to client checks.
    const missingFn =
      rpcError.code === "42883"
      || /does not exist|Could not find the function/i.test(rpcError.message || "")
    if (!missingFn) {
      const notFound = rpcError.code === "P0002" || /not found/i.test(rpcError.message || "")
      throw new OrgScopedMutationError(
        notFound ? "Child record not found under the verified parent." : "Unable to verify child parent chain.",
        notFound ? 404 : 503,
        notFound ? "entity_not_found" : "child_scope_unavailable",
      )
    }
  }

  const { data: parent, error: parentError } = await supabase
    .from(chain.parentTable)
    .select("id, org_id")
    .eq("id", chain.parentId)
    .eq("org_id", orgId)
    .maybeSingle()

  if (parentError) {
    throw new OrgScopedMutationError(
      "Unable to verify parent organization scope.",
      503,
      "parent_scope_unavailable",
    )
  }
  if (!parent?.id) {
    throw new OrgScopedMutationError("Parent record not found.", 404, "entity_not_found")
  }

  const { data: child, error: childError } = await supabase
    .from(chain.childTable)
    .select(`id, ${chain.parentFkColumn}`)
    .eq("id", chain.childId)
    .eq(chain.parentFkColumn, chain.parentId)
    .maybeSingle()

  if (childError) {
    throw new OrgScopedMutationError(
      "Unable to verify child parent chain.",
      503,
      "child_scope_unavailable",
    )
  }
  if (!child?.id) {
    throw new OrgScopedMutationError(
      "Child record not found under the verified parent.",
      404,
      "entity_not_found",
    )
  }

  return { parentId: parent.id, childId: child.id }
}

/**
 * Update a child row only after the parent chain is verified for the acting org.
 * Mutation still predicates on child id + parent FK (blocks IDOR by guessed child id).
 */
export async function orgScopedChildUpdate<T = Record<string, unknown>>(args: {
  supabase: SupabaseClient
  orgId: string
  chain: ParentChainSpec
  patch: Record<string, unknown>
  select?: string
}): Promise<OrgScopedMutationResult<T>> {
  await assertChildParentOrgChain(args.supabase, args.orgId, args.chain)

  const { data, error } = await args.supabase
    .from(args.chain.childTable)
    .update(args.patch)
    .eq("id", args.chain.childId)
    .eq(args.chain.parentFkColumn, args.chain.parentId)
    .select(args.select || "*")
    .maybeSingle()

  return { data: (data as T) || null, error: error || null }
}

/**
 * Delete a child row only after the parent chain is verified for the acting org.
 */
export async function orgScopedChildDelete(args: {
  supabase: SupabaseClient
  orgId: string
  chain: ParentChainSpec
}): Promise<OrgScopedMutationResult<{ id: string }>> {
  await assertChildParentOrgChain(args.supabase, args.orgId, args.chain)

  const { data, error } = await args.supabase
    .from(args.chain.childTable)
    .delete()
    .eq("id", args.chain.childId)
    .eq(args.chain.parentFkColumn, args.chain.parentId)
    .select("id")
    .maybeSingle()

  return { data: data || null, error: error || null }
}

/** Resolve parent id for a child row (used when client only sends child id). */
export async function resolveChildParentId(args: {
  supabase: SupabaseClient
  childTable: string
  childId: string
  parentFkColumn: string
}): Promise<string | null> {
  const { data, error } = await args.supabase
    .from(args.childTable)
    .select(args.parentFkColumn)
    .eq("id", args.childId)
    .maybeSingle()

  if (error || !data) return null
  const parentId = data[args.parentFkColumn]
  return typeof parentId === "string" ? parentId : null
}
