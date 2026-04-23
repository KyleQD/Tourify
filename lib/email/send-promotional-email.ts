/**
 * Manual / campaign send helper for account-type promotional emails via Resend.
 * Does not run automatically on signup or onboarding.
 */

import {
  EmailDeliveryService,
  type EmailResult,
} from "@/lib/services/email-delivery.service"
import {
  buildPromotionalEmailForAccountType,
  type PromotionalAccountType,
  type PromoEmailBaseArgs,
} from "./account-promotional-templates"

export type { PromotionalAccountType }

export async function sendPromotionalEmailViaResend(
  params: {
    to: string
    accountType: PromotionalAccountType
  } & PromoEmailBaseArgs,
): Promise<EmailResult> {
  const { subject, html, text } = buildPromotionalEmailForAccountType(params.accountType, {
    ctaUrl: params.ctaUrl,
    logoOrigin: params.logoOrigin,
    secondaryCta: params.secondaryCta,
  })
  return EmailDeliveryService.sendNotificationEmail({
    to: params.to,
    subject,
    html,
    text,
  })
}
