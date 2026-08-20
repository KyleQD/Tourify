import { z } from 'zod'

import {
  assertProgramTransition,
  type PromoterProgramStatus,
} from '@/lib/promoter-network/domain'

const ISO_DATE_TIME = z.string().datetime({ offset: true })

const ticketEligibilitySchema = z.object({
  ticket_type_id: z.string().uuid(),
  commission_type_override: z.enum(['percentage', 'fixed_per_ticket']).nullable().optional(),
  commission_rate_bps_override: z.number().int().min(0).max(10_000).nullable().optional(),
  commission_fixed_amount_minor_override: z.number().int().min(0).nullable().optional(),
}).superRefine((value, context) => {
  const hasOverride = value.commission_type_override !== null && value.commission_type_override !== undefined
  if (!hasOverride) {
    if (value.commission_rate_bps_override != null || value.commission_fixed_amount_minor_override != null) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'An override type is required when setting an override amount.' })
    }
    return
  }
  if (value.commission_type_override === 'percentage' && value.commission_rate_bps_override == null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'A percentage override requires basis points.' })
  }
  if (value.commission_type_override === 'fixed_per_ticket' && value.commission_fixed_amount_minor_override == null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'A fixed override requires a minor-unit amount.' })
  }
})

const promoterProgramBaseSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'open', 'paused', 'closed', 'cancelled']).default('draft'),
  application_mode: z.enum(['open', 'approval_required', 'invite_only']).default('approval_required'),
  commission_type: z.enum(['percentage', 'fixed_per_ticket']),
  commission_rate_bps: z.number().int().min(0).max(10_000).nullable().optional(),
  commission_fixed_amount_minor: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().toLowerCase().regex(/^[a-z]{3}$/).default('usd'),
  attribution_window_days: z.number().int().min(1).max(90),
  starts_at: ISO_DATE_TIME.nullable().optional(),
  ends_at: ISO_DATE_TIME.nullable().optional(),
  promoter_cap: z.number().int().positive().nullable().optional(),
  allow_promo_codes: z.boolean().default(false),
  allow_native_post_attribution: z.boolean().default(true),
  allow_external_links: z.boolean().default(true),
  terms_markdown: z.string().trim().max(20_000).nullable().optional(),
  eligible_ticket_types: z.array(ticketEligibilitySchema).min(1).max(500),
}).strict()

export const promoterProgramSettingsSchema = promoterProgramBaseSchema.superRefine((value, context) => {
  if (value.commission_type === 'percentage') {
    if (value.commission_rate_bps == null || value.commission_fixed_amount_minor != null) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Percentage commission requires basis points and no fixed amount.' })
    }
  } else if (value.commission_fixed_amount_minor == null || value.commission_rate_bps != null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Fixed commission requires a minor-unit amount and no basis points.' })
  }
  if (value.starts_at && value.ends_at && new Date(value.ends_at) <= new Date(value.starts_at)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'The campaign end must be after its start.' })
  }
  const ticketIds = value.eligible_ticket_types.map((ticket) => ticket.ticket_type_id)
  if (new Set(ticketIds).size !== ticketIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Each ticket type can only be selected once.' })
  }
})

export const promoterProgramPatchSchema = promoterProgramBaseSchema.partial().extend({
  eligible_ticket_types: z.array(ticketEligibilitySchema).min(1).max(500).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one setting is required.')

export type PromoterProgramSettings = z.output<typeof promoterProgramSettingsSchema>
export type PromoterTicketEligibility = z.output<typeof ticketEligibilitySchema>

export interface PromoterProgramSnapshot extends PromoterProgramSettings {
  id: string
  event_id: string
  organizer_org_id: string | null
  current_version_number: number
  created_at: string
  updated_at: string
}

const FINANCIAL_TERM_KEYS: Array<keyof PromoterProgramSettings> = [
  'commission_type',
  'commission_rate_bps',
  'commission_fixed_amount_minor',
  'currency',
  'attribution_window_days',
  'terms_markdown',
  'eligible_ticket_types',
]

function stableEligibility(value: PromoterTicketEligibility[]) {
  return [...value]
    .map((ticket) => ({
      ticket_type_id: ticket.ticket_type_id,
      commission_type_override: ticket.commission_type_override ?? null,
      commission_rate_bps_override: ticket.commission_rate_bps_override ?? null,
      commission_fixed_amount_minor_override: ticket.commission_fixed_amount_minor_override ?? null,
    }))
    .sort((a, b) => a.ticket_type_id.localeCompare(b.ticket_type_id))
}

export function hasPromoterFinancialTermsChanged(
  current: PromoterProgramSettings,
  next: PromoterProgramSettings,
): boolean {
  return FINANCIAL_TERM_KEYS.some((key) => {
    if (key === 'eligible_ticket_types') {
      return JSON.stringify(stableEligibility(current.eligible_ticket_types))
        !== JSON.stringify(stableEligibility(next.eligible_ticket_types))
    }
    return current[key] !== next[key]
  })
}

export function assertRequestedProgramTransition(
  current: PromoterProgramStatus,
  next: PromoterProgramStatus,
): void {
  if (current !== next) assertProgramTransition(current, next)
}
