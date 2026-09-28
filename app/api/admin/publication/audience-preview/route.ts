import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  buildPublicationAudiencePreview,
  type AudienceCandidate,
} from "@/lib/admin/publication-audience-preview"
import { PUBLICATION_AUDIENCE_CLASSES, PUBLICATION_DELIVERY_CHANNELS } from "@/lib/admin/publication-schema"
import { withAdminCapability } from "@/lib/auth/api-auth"

const candidateSchema = z.object({
  subjectType: z.enum(["user", "email", "vendor", "role_group"]),
  subjectId: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().optional().nullable(),
  source: z.string().min(1),
  audienceClass: z.enum(PUBLICATION_AUDIENCE_CLASSES),
  channels: z.array(z.enum(PUBLICATION_DELIVERY_CHANNELS)).min(1),
  protectedFields: z.array(z.string()).default([]),
  excluded: z.boolean().optional(),
  excludeReason: z.string().optional(),
})

const bodySchema = z.object({
  publicationType: z.string().min(1),
  candidates: z.array(candidateSchema).max(2000),
  channelAvailability: z.record(z.boolean()).optional(),
})

/** PUB-203 — Audience resolution preview before confirmation. */
export const POST = withAdminCapability("tour.publish", async (request: NextRequest, { admin }) => {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }

    const preview = buildPublicationAudiencePreview({
      publicationType: parsed.data.publicationType,
      candidates: parsed.data.candidates as AudienceCandidate[],
      channelAvailability: parsed.data.channelAvailability || {},
    })

    return NextResponse.json({
      success: true,
      orgId: admin.orgId,
      preview,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Audience preview failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
