import { z } from 'zod'

const dateString = z.string().max(64).refine(
  value => !Number.isNaN(Date.parse(value)),
  'Invalid date',
)
const optionalDate = z.preprocess(
  value => value === '' || value === null ? undefined : value,
  dateString.optional(),
)
const nullableOptionalDate = z.preprocess(
  value => value === '' ? null : value,
  dateString.optional().nullable(),
)
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable()
const metadata = z.record(z.unknown()).optional()

export const ticketTypeCategorySchema = z.enum([
  'general',
  'vip',
  'premium',
  'early_bird',
  'student',
  'senior',
  'group',
  'backstage',
])

const ticketTypeMutableFields = {
  name: z.string().trim().min(1).max(160),
  description: optionalText(4_000),
  price: z.number().finite().nonnegative().max(1_000_000),
  quantity_available: z.number().int().min(1).max(10_000_000),
  max_per_customer: z.number().int().min(1).max(10_000).optional().nullable(),
  sale_start: nullableOptionalDate,
  sale_end: nullableOptionalDate,
  category: ticketTypeCategorySchema,
  benefits: z.array(z.string().trim().min(1).max(240)).max(100).optional(),
  seating_section: optionalText(160),
  is_transferable: z.boolean(),
  transfer_fee: z.number().finite().nonnegative().max(1_000_000),
  refund_policy: z.string().trim().max(4_000),
  age_restriction: z.number().int().min(0).max(120).optional().nullable(),
  requires_id: z.boolean(),
  featured: z.boolean(),
  priority_order: z.number().int().min(-10_000).max(10_000),
  is_active: z.boolean(),
  metadata,
  visibility: z.enum(['public', 'private', 'hidden', 'access_code']),
  access_level: z.string().trim().min(1).max(120),
  min_per_order: z.number().int().min(1).max(10_000),
  internal_notes: optionalText(4_000),
}

export const createTicketTypeSchema = z.object({
  action: z.literal('create_ticket_type'),
  event_id: z.string().uuid('Invalid event ID'),
  ...ticketTypeMutableFields,
  description: ticketTypeMutableFields.description,
  max_per_customer: ticketTypeMutableFields.max_per_customer,
  sale_start: ticketTypeMutableFields.sale_start,
  sale_end: ticketTypeMutableFields.sale_end,
  category: ticketTypeMutableFields.category.default('general'),
  benefits: ticketTypeMutableFields.benefits,
  seating_section: ticketTypeMutableFields.seating_section,
  is_transferable: ticketTypeMutableFields.is_transferable.default(true),
  transfer_fee: ticketTypeMutableFields.transfer_fee.default(0),
  refund_policy: ticketTypeMutableFields.refund_policy.default('No refunds'),
  age_restriction: ticketTypeMutableFields.age_restriction,
  requires_id: ticketTypeMutableFields.requires_id.default(false),
  featured: ticketTypeMutableFields.featured.default(false),
  priority_order: ticketTypeMutableFields.priority_order.default(0),
  is_active: ticketTypeMutableFields.is_active.default(true),
  metadata: ticketTypeMutableFields.metadata,
  visibility: ticketTypeMutableFields.visibility.default('public'),
  access_level: ticketTypeMutableFields.access_level.default('general'),
  min_per_order: ticketTypeMutableFields.min_per_order.default(1),
  internal_notes: ticketTypeMutableFields.internal_notes,
}).strict()

export const updateTicketTypeSchema = z.object({
  action: z.literal('update_ticket_type'),
  id: z.string().uuid('Invalid ticket type ID'),
  name: ticketTypeMutableFields.name.optional(),
  description: ticketTypeMutableFields.description,
  price: ticketTypeMutableFields.price.optional(),
  quantity_available: ticketTypeMutableFields.quantity_available.optional(),
  max_per_customer: ticketTypeMutableFields.max_per_customer,
  sale_start: ticketTypeMutableFields.sale_start,
  sale_end: ticketTypeMutableFields.sale_end,
  category: ticketTypeMutableFields.category.optional(),
  benefits: ticketTypeMutableFields.benefits,
  seating_section: ticketTypeMutableFields.seating_section,
  is_transferable: ticketTypeMutableFields.is_transferable.optional(),
  transfer_fee: ticketTypeMutableFields.transfer_fee.optional(),
  refund_policy: ticketTypeMutableFields.refund_policy.optional(),
  age_restriction: ticketTypeMutableFields.age_restriction,
  requires_id: ticketTypeMutableFields.requires_id.optional(),
  featured: ticketTypeMutableFields.featured.optional(),
  priority_order: ticketTypeMutableFields.priority_order.optional(),
  is_active: ticketTypeMutableFields.is_active.optional(),
  metadata: ticketTypeMutableFields.metadata,
  visibility: ticketTypeMutableFields.visibility.optional(),
  access_level: ticketTypeMutableFields.access_level.optional(),
  min_per_order: ticketTypeMutableFields.min_per_order.optional(),
  internal_notes: ticketTypeMutableFields.internal_notes,
}).strict().refine(
  value => Object.keys(value).some(key => !['action', 'id'].includes(key)),
  'At least one update field is required',
)

export const createCampaignSchema = z.object({
  action: z.literal('create_campaign'),
  event_id: z.string().uuid('Invalid event ID'),
  name: z.string().trim().min(1).max(160),
  description: optionalText(4_000),
  campaign_type: z.enum([
    'early_bird',
    'flash_sale',
    'group_discount',
    'loyalty',
    'referral',
    'social_media',
    'email',
    'influencer',
  ]),
  discount_type: z.enum(['percentage', 'fixed', 'buy_one_get_one', 'free_upgrade']),
  discount_value: z.number().finite().nonnegative().max(1_000_000),
  start_date: dateString,
  end_date: dateString,
  max_uses: z.number().int().min(1).max(10_000_000).optional().nullable(),
  applicable_ticket_types: z.array(z.string().uuid()).max(500).optional(),
  target_audience: z.record(z.unknown()).optional(),
}).strict()

export const createPromoCodeSchema = z.object({
  action: z.literal('create_promo_code'),
  campaign_id: z.string().uuid('Invalid campaign ID').optional().nullable(),
  event_id: z.string().uuid('Invalid event ID'),
  code: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_-]+$/),
  description: optionalText(1_000),
  discount_type: z.enum(['percentage', 'fixed', 'free_shipping']),
  discount_value: z.number().finite().nonnegative().max(1_000_000),
  min_purchase_amount: z.number().finite().nonnegative().max(1_000_000).default(0),
  max_discount_amount: z.number().finite().nonnegative().max(1_000_000).optional().nullable(),
  max_uses: z.number().int().min(1).max(10_000_000).optional().nullable(),
  applicable_ticket_types: z.array(z.string().uuid()).max(500).optional(),
  start_date: optionalDate,
  end_date: optionalDate,
  expires_at: optionalDate,
}).strict().refine(value => Boolean(value.end_date || value.expires_at), {
  message: 'An end date is required',
  path: ['end_date'],
})

export const generateReferralCodesSchema = z.object({
  action: z.literal('generate_referral_codes'),
  event_id: z.string().uuid('Invalid event ID'),
  count: z.number().int().min(1).max(100).default(10),
  discount_amount: z.number().finite().nonnegative().max(1_000_000).default(10),
}).strict()

export const ticketingCreateSchema = z.union([
  createTicketTypeSchema,
  createCampaignSchema,
  createPromoCodeSchema,
  generateReferralCodesSchema,
])

export const ticketingQuerySchema = z.object({
  type: z.enum([
    'overview',
    'ticket_types',
    'campaigns',
    'promo_codes',
    'sales',
    'analytics',
    'social_performance',
    'referrals',
  ]).default('overview'),
  event_id: z.string().uuid('Invalid event ID').optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
})

export function assertDateOrder(
  start: string | null | undefined,
  end: string | null | undefined,
  label: string,
) {
  if (start && end && new Date(end) <= new Date(start)) {
    throw new TicketingValidationError(`${label} end date must be after start date`)
  }
}

export function assertPercentageDiscount(type: string, value: number) {
  if (type === 'percentage' && value > 100) {
    throw new TicketingValidationError('Percentage discounts cannot exceed 100')
  }
}

export class TicketingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TicketingValidationError'
  }
}
