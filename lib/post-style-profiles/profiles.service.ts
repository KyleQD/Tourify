export interface StyleProfileRow {
  id: string
  owner_type: string
  owner_id: string
  name: string
  template_id: string
  template_version: number
  schema_version: number
  configuration: Record<string, unknown>
  approved_assets: unknown[]
  is_default: boolean
  status: "active" | "archived"
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateStyleProfileInput {
  ownerType: string
  ownerId: string
  name: string
  templateId: string
  configuration: Record<string, unknown>
  setAsDefault?: boolean
  createdBy: string
  templateVersion?: number
  schemaVersion?: number
}

export interface UpdateStyleProfileInput {
  name?: string
  templateId?: string
  configuration?: Record<string, unknown>
  setAsDefault?: boolean
  templateVersion?: number
  schemaVersion?: number
}

/**
 * List all active style profiles for a given owner.
 * The caller must have already resolved the acting account context.
 */
export async function listStyleProfiles(
  supabase: any,
  ownerType: string,
  ownerId: string,
): Promise<StyleProfileRow[]> {
  const { data, error } = await supabase
    .from("post_style_profiles")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to list style profiles: ${error.message}`)
  return (data ?? []) as StyleProfileRow[]
}

/**
 * Create a new style profile. If setAsDefault, clears any existing default first.
 */
export async function createStyleProfile(
  supabase: any,
  input: CreateStyleProfileInput,
): Promise<StyleProfileRow> {
  if (input.setAsDefault) {
    await clearDefault(supabase, input.ownerType, input.ownerId)
  }

  const { data, error } = await supabase
    .from("post_style_profiles")
    .insert({
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      name: input.name.trim(),
      template_id: input.templateId,
      template_version: input.templateVersion ?? 1,
      schema_version: input.schemaVersion ?? 3,
      configuration: input.configuration,
      approved_assets: [],
      is_default: input.setAsDefault ?? false,
      status: "active",
      created_by: input.createdBy,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create style profile: ${error.message}`)
  return data as StyleProfileRow
}

/**
 * Update a profile's name, configuration, or default status.
 * Verifies the profile belongs to the acting user before updating.
 */
export async function updateStyleProfile(
  supabase: any,
  profileId: string,
  createdBy: string,
  ownerType: string,
  ownerId: string,
  input: UpdateStyleProfileInput,
): Promise<StyleProfileRow> {
  const { data: existing, error: fetchError } = await supabase
    .from("post_style_profiles")
    .select("id, owner_type, owner_id, status")
    .eq("id", profileId)
    .eq("created_by", createdBy)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .single()

  if (fetchError || !existing) throw new Error("Profile not found or unauthorized")
  if (existing.status === "archived") throw new Error("Cannot update an archived profile")

  if (input.setAsDefault) {
    await clearDefault(supabase, existing.owner_type, existing.owner_id)
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.templateId !== undefined) updates.template_id = input.templateId
  if (input.configuration !== undefined) updates.configuration = input.configuration
  if (input.setAsDefault !== undefined) updates.is_default = input.setAsDefault
  if (input.templateVersion !== undefined) updates.template_version = input.templateVersion
  if (input.schemaVersion !== undefined) updates.schema_version = input.schemaVersion

  const { data, error } = await supabase
    .from("post_style_profiles")
    .update(updates)
    .eq("id", profileId)
    .eq("created_by", createdBy)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update style profile: ${error.message}`)
  return data as StyleProfileRow
}

/**
 * Archive a profile (soft delete). Does not break published post snapshots.
 */
export async function archiveStyleProfile(
  supabase: any,
  profileId: string,
  createdBy: string,
  ownerType: string,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("post_style_profiles")
    .update({ status: "archived", is_default: false })
    .eq("id", profileId)
    .eq("created_by", createdBy)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)

  if (error) throw new Error(`Failed to archive style profile: ${error.message}`)
}

/**
 * Set a profile as the default. Atomically clears any existing default first.
 */
export async function setDefaultStyleProfile(
  supabase: any,
  profileId: string,
  createdBy: string,
  ownerType: string,
  ownerId: string,
): Promise<void> {
  const { data: target, error: fetchError } = await supabase
    .from("post_style_profiles")
    .select("id, owner_type, owner_id, status, template_id")
    .eq("id", profileId)
    .eq("created_by", createdBy)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .single()

  if (fetchError || !target) throw new Error("Profile not found or unauthorized")
  if (target.status === "archived") throw new Error("Cannot set an archived profile as default")

  const { getTemplateById } = await import("@/lib/post-appearance/template-registry")
  if (getTemplateById(target.template_id)?.lifecycle !== "active") {
    throw new Error("Cannot set a legacy style as default")
  }

  const { error } = await supabase.rpc("set_post_style_profile_default", {
    p_profile_id: profileId,
  })

  if (error) throw new Error(`Failed to set default: ${error.message}`)
}

/**
 * Get the current default profile for an owner, or null if none set.
 */
export async function getDefaultStyleProfile(
  supabase: any,
  ownerType: string,
  ownerId: string,
): Promise<StyleProfileRow | null> {
  const { data, error } = await supabase
    .from("post_style_profiles")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .eq("is_default", true)
    .eq("status", "active")
    .maybeSingle()

  if (error) throw new Error(`Failed to get default profile: ${error.message}`)
  return (data as StyleProfileRow | null) ?? null
}

async function clearDefault(
  supabase: any,
  ownerType: string,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("post_style_profiles")
    .update({ is_default: false })
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .eq("is_default", true)
  if (error) throw new Error(`Failed to clear default style: ${error.message}`)
}
