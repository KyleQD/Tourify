/**
 * Canonical builder for `/jobs/[id]` detail links.
 *
 * The jobs surface spans two ID namespaces (artist board `artist_jobs` and venue
 * staffing `job_posting_templates`). A link is only safe to render when it resolves
 * to a real detail route, so this helper returns `null` for unresolvable inputs and
 * always emits a source-tagged URL when it can.
 */

export type JobDetailSource = "artist" | "venue"

interface BuildJobDetailHrefArgs {
  id?: string | null
  source?: string | null
  detailHref?: string | null
  templateId?: string | null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isResolvableId(value?: string | null): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

function normalizeSource(source?: string | null): JobDetailSource {
  return source === "artist" ? "artist" : "venue"
}

/**
 * Returns a canonical, source-tagged detail href, or `null` when the input cannot
 * resolve to a real listing (so callers can hide the link instead of 404ing).
 */
export function buildJobDetailHref(args: BuildJobDetailHrefArgs): string | null {
  if (typeof args.detailHref === "string" && args.detailHref.length > 0) return args.detailHref

  const id = args.templateId ?? args.id
  if (!isResolvableId(id)) return null

  return `/jobs/${id}?source=${normalizeSource(args.source)}`
}
