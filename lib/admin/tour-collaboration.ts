import { z } from "zod"

const nullableText = (max: number) => z.string().trim().max(max).optional().nullable()

export const tourTeamInputSchema = z.object({
  tour_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(120).optional(),
  team_type: z.string().trim().max(120).optional().nullable(),
  description: nullableText(2000),
})

const tourMemberBaseSchema = z.object({
  tour_id: z.string().uuid(),
  team_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(160).optional(),
  role: z.string().trim().min(1).max(160),
  email: z.union([z.string().trim().email(), z.literal("")])
    .transform(value => value || null)
    .optional()
    .nullable(),
  phone: nullableText(80),
  status: z.enum(["confirmed", "pending", "declined"]).default("pending"),
  arrival_date: nullableText(40),
  departure_date: nullableText(40),
  responsibilities: nullableText(4000),
})

export const tourMemberInputSchema = tourMemberBaseSchema.refine(input => Boolean(input.user_id || input.name || input.email), {
  message: "A user, name, or email is required.",
})

export const tourMemberPatchSchema = tourMemberBaseSchema
  .omit({ tour_id: true })
  .partial()

export const tourVendorInputSchema = z.object({
  tour_id: z.string().uuid(),
  vendor_account_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(160),
  contact_name: z.string().trim().max(160).optional().default(""),
  contact_email: z.union([z.string().trim().email(), z.literal("")]).optional().default(""),
  contact_phone: z.string().trim().max(80).optional().default(""),
  status: z.enum(["confirmed", "pending", "declined"]).default("pending"),
  services: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  contract_amount: z.number().finite().min(0).optional().nullable(),
  payment_status: z.enum(["paid", "partial", "pending"]).default("pending"),
  notes: nullableText(5000),
})

export const tourArtistInputSchema = z.object({
  tour_id: z.string().uuid(),
  artist_user_id: z.string().uuid().optional().nullable(),
  artist_name: z.string().trim().min(1).max(200).optional().nullable(),
  role: nullableText(160),
}).refine(input => Boolean(input.artist_user_id || input.artist_name), {
  message: "An artist account or artist name is required.",
})

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

export function spreadsheetCsvCell(value: unknown) {
  let output = value == null ? "" : String(value)
  if (/^[=+\-@]/.test(output)) output = `'${output}`
  return `"${output.replace(/"/g, '""')}"`
}

export function presentTourMember(row: Record<string, unknown>) {
  const profile = record(row.profile)
  return {
    ...row,
    id: text(row.id),
    tour_id: text(row.tour_id),
    team_id: text(row.team_id) || null,
    user_id: text(row.user_id) || null,
    name: text(row.name, text(profile.name, text(profile.full_name, text(profile.display_name, "Team member")))),
    role: text(row.role, text(row.role_in_team, "member")),
    email: text(row.email, text(profile.email)),
    phone: text(row.phone, text(profile.phone)),
    status: text(row.status, row.is_active === false ? "declined" : "confirmed"),
    arrival_date: row.arrival_date ?? profile.arrival_date ?? null,
    departure_date: row.departure_date ?? profile.departure_date ?? null,
    responsibilities: row.responsibilities ?? profile.responsibilities ?? null,
  }
}

export function presentTourVendor(row: Record<string, unknown>) {
  const contact = record(row.contact)
  return {
    ...row,
    name: text(row.vendor_name, text(row.name, "Vendor")),
    type: text(row.service_type, text(row.type, "Service")),
    contact_name: text(contact.name, text(row.contact_name)),
    contact_email: text(contact.email, text(row.contact_email)),
    contact_phone: text(contact.phone, text(row.contact_phone)),
    status: text(row.status, "pending"),
    services: Array.isArray(row.services)
      ? row.services.filter((item): item is string => typeof item === "string")
      : Array.isArray(contact.services)
        ? contact.services.filter((item): item is string => typeof item === "string")
        : [],
    contract_amount: row.contract_amount ?? null,
    payment_status: text(row.payment_status, "pending"),
    notes: row.notes ?? contact.notes ?? null,
  }
}

export function buildTourMemberWrite(input: z.infer<typeof tourMemberInputSchema>, actorUserId: string, teamId: string) {
  return {
    tour_id: input.tour_id,
    team_id: teamId,
    user_id: input.user_id ?? null,
    assigned_by: actorUserId,
    assigned_at: new Date().toISOString(),
    name: input.name ?? null,
    role: input.role,
    role_in_team: input.role,
    email: input.email ?? null,
    phone: input.phone ?? null,
    status: input.status,
    is_active: input.status !== "declined",
    arrival_date: input.arrival_date ?? null,
    departure_date: input.departure_date ?? null,
    responsibilities: input.responsibilities ?? null,
    profile: {
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      arrival_date: input.arrival_date ?? null,
      departure_date: input.departure_date ?? null,
      responsibilities: input.responsibilities ?? null,
    },
  }
}

export function buildTourVendorWrite(input: z.infer<typeof tourVendorInputSchema>, actorUserId: string) {
  return {
    tour_id: input.tour_id,
    vendor_account_id: input.vendor_account_id ?? null,
    vendor_name: input.name,
    service_type: input.type,
    contact: {
      name: input.contact_name,
      email: input.contact_email,
      phone: input.contact_phone,
      services: input.services,
      notes: input.notes ?? null,
    },
    status: input.status,
    services: input.services,
    contract_amount: input.contract_amount ?? null,
    payment_status: input.payment_status,
    notes: input.notes ?? null,
    created_by: actorUserId,
  }
}
