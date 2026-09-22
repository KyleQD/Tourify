import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/services/notification-channels", () => ({
  sendEmailNotification: vi.fn(async () => ({ success: true, providerId: "resend", providerRef: "email-1" })),
  sendSMSNotification: vi.fn(async () => ({ success: true, providerId: "twilio", providerRef: "sms-1" })),
  sendPushNotification: vi.fn(async () => ({ success: true, providerId: "expo", providerRef: "push-1" })),
}))

import {
  assertPublicationChannelContract,
  emailPublicationChannelAdapter,
  getPublicationChannelAdapter,
  inAppPublicationChannelAdapter,
  listPublicationChannelAdapters,
  smsPublicationChannelAdapter,
} from "@/lib/admin/publication-channel-adapters"
import {
  sendEmailNotification,
  sendSMSNotification,
} from "@/lib/services/notification-channels"

const baseInput = {
  orgId: "org-1",
  snapshotId: "snap-1",
  deliveryId: "del-1",
  recipientId: "rec-1",
  correlationId: "corr-1",
  idempotencyKey: "idem-1",
  subjectKey: "user-1",
  title: "Day sheet",
  body: "Tonight's call time is 4pm",
  deepLink: "/work/assignments/1",
}

describe("PUB-103 publication channel adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("treats in-app as first-class and registers all channels", () => {
    const contract = assertPublicationChannelContract()
    expect(contract.firstClass).toContain("in_app")
    expect(contract.channels.sort()).toEqual(["email", "in_app", "push", "sms"])
    expect(listPublicationChannelAdapters().every((a) => typeof a.send === "function")).toBe(true)
    expect(getPublicationChannelAdapter("in_app").isFirstClass).toBe(true)
  })

  it("exposes request, provider, state, retryability, cost, and consent metadata", async () => {
    const request = emailPublicationChannelAdapter.buildRequest({
      ...baseInput,
      subjectKey: "crew@example.com",
      consent: { consentGranted: true },
    })

    expect(request.channel).toBe("email")
    expect(request.consent.consentRequired).toBe(true)
    expect(request.cost.billable).toBe(true)
    expect(request.cost.unit).toBe("message")

    const result = await emailPublicationChannelAdapter.send(request)
    expect(result.providerId).toBe("resend")
    expect(result.providerRef).toBe("email-1")
    expect(result.state).toBe("sent")
    expect(result.retryable).toBe(false)
    expect(result.consent).toEqual(request.consent)
    expect(result.cost).toEqual(request.cost)
    expect(sendEmailNotification).toHaveBeenCalledOnce()
  })

  it("fails consent closed for email unless evidence explicitly grants it", async () => {
    const request = emailPublicationChannelAdapter.buildRequest({
      ...baseInput,
      subjectKey: "crew@example.com",
    })

    expect(request.consent.consentRequired).toBe(true)
    expect(request.consent.consentGranted).toBe(false)
    const result = await emailPublicationChannelAdapter.send(request)
    expect(result.state).toBe("suppressed")
    expect(result.providerRef).toBeNull()
    expect(sendEmailNotification).not.toHaveBeenCalled()
  })

  it("suppresses SMS without consent and marks non-retryable", async () => {
    const request = smsPublicationChannelAdapter.buildRequest({
      ...baseInput,
      subjectKey: "+15555550100",
    })
    expect(request.consent.consentGranted).toBe(false)

    const result = await smsPublicationChannelAdapter.send(request)
    expect(result.state).toBe("suppressed")
    expect(result.errorClass).toBe("suppressed")
    expect(result.retryable).toBe(false)
    expect(result.cost.billable).toBe(false)
    expect(sendSMSNotification).not.toHaveBeenCalled()
  })

  it("delivers in-app via notifications table with provider tourify.in_app", async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        maybeSingle: async () => ({ data: { id: "notif-1" }, error: null }),
      }),
    })
    const supabase = { from: vi.fn(() => ({ insert })) } as any

    const request = inAppPublicationChannelAdapter.buildRequest(baseInput)
    const result = await inAppPublicationChannelAdapter.send(request, { supabase })

    expect(result.state).toBe("delivered")
    expect(result.providerId).toBe("tourify.in_app")
    expect(result.providerRef).toBe("notif-1")
    expect(insert).toHaveBeenCalled()
  })
})
