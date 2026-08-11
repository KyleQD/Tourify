/**
 * TOUR-209 — Org tour tag catalog + tour tag links.
 */

function slugifyTagLabel(label: string): string {
  return label
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export interface OrgTourTag {
  id: string
  org_id: string
  slug: string
  label: string
  color: string | null
}

export function presentOrgTourTag(row: Record<string, unknown>): OrgTourTag {
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    slug: String(row.slug),
    label: String(row.label),
    color: row.color ? String(row.color) : null,
  }
}

export async function listOrgTourTags(args: {
  supabase: SupabaseLike
  orgId: string
}): Promise<OrgTourTag[]> {
  const { data, error } = await args.supabase
    .from("org_tour_tags")
    .select("id, org_id, slug, label, color")
    .eq("org_id", args.orgId)
    .order("label", { ascending: true })
  if (error) {
    if (error.code === "42P01") return []
    throw new Error(error.message)
  }
  return (data ?? []).map((row: Record<string, unknown>) => presentOrgTourTag(row))
}

export async function createOrgTourTag(args: {
  supabase: SupabaseLike
  orgId: string
  userId: string
  label: string
  color?: string | null
}): Promise<OrgTourTag> {
  const label = args.label.trim()
  if (!label) throw new Error("Tag label is required")
  const slug = slugifyTagLabel(label)
  if (!slug) throw new Error("Tag label must include letters or numbers")

  const { data, error } = await args.supabase
    .from("org_tour_tags")
    .insert({
      org_id: args.orgId,
      slug,
      label,
      color: args.color ?? null,
      created_by: args.userId,
    })
    .select("id, org_id, slug, label, color")
    .single()
  if (error) throw new Error(error.message)
  return presentOrgTourTag(data)
}

export async function loadTourTagsByTourIds(args: {
  supabase: SupabaseLike
  tourIds: string[]
}): Promise<Map<string, OrgTourTag[]>> {
  const map = new Map<string, OrgTourTag[]>()
  if (args.tourIds.length === 0) return map

  const { data, error } = await args.supabase
    .from("tour_tag_links")
    .select("tour_id, org_tour_tags(id, org_id, slug, label, color)")
    .in("tour_id", args.tourIds)
  if (error) {
    if (error.code === "42P01") return map
    throw new Error(error.message)
  }

  for (const row of data ?? []) {
    const tourId = String(row.tour_id)
    const tagRow = row.org_tour_tags as Record<string, unknown> | null
    if (!tagRow?.id) continue
    const list = map.get(tourId) ?? []
    list.push(presentOrgTourTag(tagRow))
    map.set(tourId, list)
  }
  return map
}

export async function replaceTourTags(args: {
  supabase: SupabaseLike
  tourId: string
  orgId: string
  userId: string
  tagIds: string[]
}): Promise<OrgTourTag[]> {
  const unique = [...new Set(args.tagIds.filter(Boolean))]
  await args.supabase.from("tour_tag_links").delete().eq("tour_id", args.tourId)

  if (unique.length === 0) return []

  const { data: tags, error: tagError } = await args.supabase
    .from("org_tour_tags")
    .select("id, org_id, slug, label, color")
    .eq("org_id", args.orgId)
    .in("id", unique)
  if (tagError) throw new Error(tagError.message)
  const allowed = (tags ?? []).map((row: Record<string, unknown>) => presentOrgTourTag(row as typeof tags[number]))
  if (allowed.length === 0) return []

  type AllowedTag = typeof allowed[number]
  const { error: linkError } = await args.supabase.from("tour_tag_links").insert(
    allowed.map((tag: AllowedTag) => ({
      tour_id: args.tourId,
      tag_id: tag.id,
      created_by: args.userId,
    })),
  )
  if (linkError) throw new Error(linkError.message)
  return allowed
}
