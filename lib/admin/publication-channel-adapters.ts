/**
 * PUB-103 — Publication delivery channel adapter contract.
 *
 * In-app is first-class. Email/SMS/push adapters expose a normalized request,
 * provider ID, delivery state, retryability, and cost/consent metadata.
 * Adapters do not claim success until a provider ack (or in-app persist) succeeds.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { PublicationDeliveryChannel } from "@/lib/admin/publication-schema"
import {
  sendEmailNotification,
  sendPushNotification,
  sendSMSNotification,
} from "@/lib/services/notification-channels"

export type ChannelDeliveryState =
  | "accepted"
  | "queued_provider"
  | "sent"
  | "delivered"
  | "failed"
  | "suppressed"

export interface ChannelConsentMetadata {
  consentRequired: boolean
  consentGranted: boolean
  consentSource: "org_policy" | "user_preference" | "explicit_opt_in" | "transactional" | "unknown"
  marketing: boolean
}

export interface ChannelCostMetadata {
  estimatedUnits: number
  unit: "message" | "notification" | "segment"
  currencyHint: "USD" | "credits" | "none"
  billable: boolean
}

export interface PublicationChannelRequest {
  orgId: string
  snapshotId: string
  deliveryId: string
  recipientId: string
  channel: PublicationDeliveryChannel
  correlationId: string
  idempotencyKey: string
  subjectKey: string
  title: string
  body: string
  deepLink?: string | null
  htmlBody?: string | null
  pushToken?: string | null
  metadata?: Record<string, unknown>
  consent: ChannelConsentMetadata
  cost: ChannelCostMetadata
}

export interface PublicationChannelSendResult {
  channel: PublicationDeliveryChannel
  state: ChannelDeliveryState
  providerId: string | null
  providerRef: string | null
  retryable: boolean
  errorClass: "retryable" | "fatal" | "suppressed" | null
  errorMessage: string | null
  consent: ChannelConsentMetadata
  cost: ChannelCostMetadata
  raw?: Record<string, unknown>
}

export type PublicationChannelRequestInput = Omit<
  PublicationChannelRequest,
  "channel" | "consent" | "cost"
> & {
  consent?: Partial<ChannelConsentMetadata>
  cost?: Partial<ChannelCostMetadata>
}

export interface PublicationChannelAdapter {
  channel: PublicationDeliveryChannel
  /** Whether this channel is considered first-class for publication delivery. */
  isFirstClass: boolean
  buildRequest(input: PublicationChannelRequestInput): PublicationChannelRequest
  send(request: PublicationChannelRequest, deps?: PublicationChannelAdapterDeps): Promise<PublicationChannelSendResult>
  classifyRetryability(error: unknown): boolean
}

export interface PublicationChannelAdapterDeps {
  supabase?: SupabaseClient
}

function suppressedResult(
  channel: PublicationDeliveryChannel,
  consent: ChannelConsentMetadata,
  cost: ChannelCostMetadata,
  reason: string,
): PublicationChannelSendResult {
  return {
    channel,
    state: "suppressed",
    providerId: null,
    providerRef: null,
    retryable: false,
    errorClass: "suppressed",
    errorMessage: reason,
    consent,
    cost: { ...cost, billable: false },
  }
}

function failedResult(
  channel: PublicationDeliveryChannel,
  consent: ChannelConsentMetadata,
  cost: ChannelCostMetadata,
  message: string,
  retryable: boolean,
): PublicationChannelSendResult {
  return {
    channel,
    state: "failed",
    providerId: null,
    providerRef: null,
    retryable,
    errorClass: retryable ? "retryable" : "fatal",
    errorMessage: message,
    consent,
    cost,
  }
}

function defaultConsent(overrides?: Partial<ChannelConsentMetadata>): ChannelConsentMetadata {
  return {
    consentRequired: false,
    consentGranted: true,
    consentSource: "transactional",
    marketing: false,
    ...overrides,
  }
}

function defaultCost(
  channel: PublicationDeliveryChannel,
  overrides?: Partial<ChannelCostMetadata>,
): ChannelCostMetadata {
  if (channel === "in_app") {
    return { estimatedUnits: 1, unit: "notification", currencyHint: "none", billable: false, ...overrides }
  }
  if (channel === "email") {
    return { estimatedUnits: 1, unit: "message", currencyHint: "credits", billable: true, ...overrides }
  }
  if (channel === "sms") {
    return { estimatedUnits: 1, unit: "segment", currencyHint: "USD", billable: true, ...overrides }
  }
  return { estimatedUnits: 1, unit: "notification", currencyHint: "credits", billable: true, ...overrides }
}

function assertConsentOrSuppress(
  channel: PublicationDeliveryChannel,
  request: PublicationChannelRequest,
): PublicationChannelSendResult | null {
  if (request.consent.consentRequired && !request.consent.consentGranted)
    return suppressedResult(request.channel, request.consent, request.cost, `${channel} suppressed: consent not granted`)
  return null
}

export const inAppPublicationChannelAdapter: PublicationChannelAdapter = {
  channel: "in_app",
  isFirstClass: true,
  buildRequest(input) {
    return {
      ...input,
      channel: "in_app",
      consent: defaultConsent({ consentSource: "org_policy", ...input.consent }),
      cost: defaultCost("in_app", input.cost),
    }
  },
  classifyRetryability(error) {
    const message = error instanceof Error ? error.message : String(error)
    return /timeout|network|temporarily|503|429/i.test(message)
  },
  async send(request, deps) {
    const suppressed = assertConsentOrSuppress("in_app", request)
    if (suppressed) return suppressed

    const supabase = deps?.supabase
    if (!supabase) {
      return failedResult("in_app", request.consent, request.cost, "In-app adapter requires supabase client", true)
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: request.subjectKey,
        type: "publication_delivery",
        title: request.title,
        content: request.body,
        metadata: {
          ...(request.metadata ?? {}),
          org_id: request.orgId,
          snapshot_id: request.snapshotId,
          delivery_id: request.deliveryId,
          recipient_id: request.recipientId,
          correlation_id: request.correlationId,
          idempotency_key: request.idempotencyKey,
          deep_link: request.deepLink ?? null,
          channel: "in_app",
        },
      })
      .select("id")
      .maybeSingle()

    if (error) {
      return failedResult(
        "in_app",
        request.consent,
        request.cost,
        error.message,
        inAppPublicationChannelAdapter.classifyRetryability(error),
      )
    }

    return {
      channel: "in_app",
      state: "delivered",
      providerId: "tourify.in_app",
      providerRef: data?.id ? String(data.id) : request.idempotencyKey,
      retryable: false,
      errorClass: null,
      errorMessage: null,
      consent: request.consent,
      cost: request.cost,
      raw: data ? { notificationId: data.id } : undefined,
    }
  },
}

export const emailPublicationChannelAdapter: PublicationChannelAdapter = {
  channel: "email",
  isFirstClass: false,
  buildRequest(input) {
    return {
      ...input,
      channel: "email",
      consent: defaultConsent({
        consentSource: "user_preference",
        consentRequired: true,
        consentGranted: false,
        ...input.consent,
      }),
      cost: defaultCost("email", input.cost),
    }
  },
  classifyRetryability(error) {
    const message = error instanceof Error ? error.message : String(error)
    return /timeout|rate|429|5\d\d|temporarily|network/i.test(message)
  },
  async send(request) {
    const suppressed = assertConsentOrSuppress("email", request)
    if (suppressed) return suppressed
    if (!request.subjectKey.includes("@")) {
      return failedResult("email", request.consent, request.cost, "Email subjectKey must be an address", false)
    }

    const result = await sendEmailNotification({
      to: request.subjectKey,
      subject: request.title,
      body: request.htmlBody ?? `<p>${escapeHtml(request.body)}</p>`,
    })

    if (!result.success) {
      const message = result.error || "Email send failed"
      return failedResult(
        "email",
        request.consent,
        request.cost,
        message,
        emailPublicationChannelAdapter.classifyRetryability(new Error(message)),
      )
    }

    return {
      channel: "email",
      state: "sent",
      providerId: result.providerId ?? "resend",
      providerRef: result.providerRef ?? null,
      retryable: false,
      errorClass: null,
      errorMessage: null,
      consent: request.consent,
      cost: request.cost,
    }
  },
}

export const smsPublicationChannelAdapter: PublicationChannelAdapter = {
  channel: "sms",
  isFirstClass: false,
  buildRequest(input) {
    return {
      ...input,
      channel: "sms",
      consent: defaultConsent({
        consentRequired: true,
        consentGranted: false,
        consentSource: "explicit_opt_in",
        ...input.consent,
      }),
      cost: defaultCost("sms", input.cost),
    }
  },
  classifyRetryability(error) {
    const message = error instanceof Error ? error.message : String(error)
    return /timeout|rate|429|5\d\d|temporarily|network|queue/i.test(message)
  },
  async send(request) {
    const suppressed = assertConsentOrSuppress("sms", request)
    if (suppressed) return suppressed

    const result = await sendSMSNotification({
      to: request.subjectKey,
      body: truncateSms(`${request.title}: ${request.body}`),
    })

    if (!result.success) {
      const message = result.error || "SMS send failed"
      return failedResult(
        "sms",
        request.consent,
        request.cost,
        message,
        smsPublicationChannelAdapter.classifyRetryability(new Error(message)),
      )
    }

    return {
      channel: "sms",
      state: "sent",
      providerId: result.providerId ?? "twilio",
      providerRef: result.providerRef ?? null,
      retryable: false,
      errorClass: null,
      errorMessage: null,
      consent: request.consent,
      cost: request.cost,
    }
  },
}

export const pushPublicationChannelAdapter: PublicationChannelAdapter = {
  channel: "push",
  isFirstClass: false,
  buildRequest(input) {
    return {
      ...input,
      channel: "push",
      consent: defaultConsent({
        consentSource: "user_preference",
        consentRequired: true,
        consentGranted: false,
        ...input.consent,
      }),
      cost: defaultCost("push", input.cost),
    }
  },
  classifyRetryability(error) {
    const message = error instanceof Error ? error.message : String(error)
    return /timeout|rate|429|5\d\d|temporarily|network/i.test(message)
  },
  async send(request) {
    const suppressed = assertConsentOrSuppress("push", request)
    if (suppressed) return suppressed

    const token = request.pushToken?.trim()
    if (!token) {
      return failedResult("push", request.consent, request.cost, "Push token required", false)
    }

    const result = await sendPushNotification({
      pushToken: token,
      title: request.title,
      body: request.body,
      data: {
        snapshotId: request.snapshotId,
        deliveryId: request.deliveryId,
        correlationId: request.correlationId,
        deepLink: request.deepLink ?? "",
      },
    })

    if (!result.success) {
      const message = result.error || "Push send failed"
      return failedResult(
        "push",
        request.consent,
        request.cost,
        message,
        pushPublicationChannelAdapter.classifyRetryability(new Error(message)),
      )
    }

    return {
      channel: "push",
      state: "sent",
      providerId: result.providerId ?? "expo",
      providerRef: result.providerRef ?? null,
      retryable: false,
      errorClass: null,
      errorMessage: null,
      consent: request.consent,
      cost: request.cost,
    }
  },
}

const ADAPTERS: Record<PublicationDeliveryChannel, PublicationChannelAdapter> = {
  in_app: inAppPublicationChannelAdapter,
  email: emailPublicationChannelAdapter,
  sms: smsPublicationChannelAdapter,
  push: pushPublicationChannelAdapter,
}

export function getPublicationChannelAdapter(
  channel: PublicationDeliveryChannel,
): PublicationChannelAdapter {
  return ADAPTERS[channel]
}

export function listPublicationChannelAdapters(): PublicationChannelAdapter[] {
  return Object.values(ADAPTERS)
}

export function assertPublicationChannelContract(): {
  firstClass: PublicationDeliveryChannel[]
  channels: PublicationDeliveryChannel[]
} {
  const adapters = listPublicationChannelAdapters()
  const missing = (["in_app", "email", "sms", "push"] as const).filter(
    (channel) => !adapters.some((adapter) => adapter.channel === channel),
  )
  if (missing.length > 0) throw new Error(`Missing publication channel adapters: ${missing.join(", ")}`)

  const firstClass = adapters.filter((adapter) => adapter.isFirstClass).map((adapter) => adapter.channel)
  if (!firstClass.includes("in_app"))
    throw new Error("In-app must be a first-class publication channel")

  return {
    firstClass,
    channels: adapters.map((adapter) => adapter.channel),
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function truncateSms(value: string, max = 320): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}
