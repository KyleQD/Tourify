import { z } from 'zod'

export const promoterApplicationSchema = z.object({
  application_message: z.string().trim().max(2_000).nullable().optional(),
}).strict()

export const promoterInvitationSchema = z.object({
  user_id: z.string().uuid(),
  message: z.string().trim().max(2_000).nullable().optional(),
}).strict()

export const promoterReviewSchema = z.object({
  review_note: z.string().trim().max(2_000).nullable().optional(),
}).strict()

export const promoterMembershipActionSchema = z.enum([
  'apply',
  'invite',
  'approve',
  'reject',
  'accept_invitation',
  'suspend',
  'revoke',
])

export type PromoterMembershipAction = z.infer<typeof promoterMembershipActionSchema>
