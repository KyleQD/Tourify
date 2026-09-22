import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  assembleTransactionalPublish,
  TransactionalPublishValidationError,
} from "@/lib/admin/publication-transactional-publish"
import {
  commitTransactionalPublication,
  TransactionalPublishAuthError,
  TransactionalPublishConflictError,
} from "@/lib/admin/publication-transactional-publish.service"
import {
  PUBLICATION_AUDIENCE_CLASSES,
  PUBLICATION_DELIVERY_CHANNELS,
  PUBLICATION_TYPES,
} from "@/lib/admin/publication-schema"
import { withAdminCapability } from "@/lib/auth/api-auth"

const candidateSchema = z.object({
  subjectType: z.enum(["user", "email", "vendor", "role_group"]),
  subjectId: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().optional().nullable(),
  source: z.string().min(1),
  audienceClass: z.enum(PUBLICATION_AUDIENCE_CLASSES).optional(),
  channels: z.array(z.enum(PUBLICATION_DELIVERY_CHANNELS)).min(1),
  protectedFields: z.array(z.string()).default([]),
  excluded: z.boolean().optional(),
  excludeReason: z.string().optional(),
  fieldAudienceClasses: z.record(z.enum(PUBLICATION_AUDIENCE_CLASSES)).optional(),
})

const sectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  required: z.boolean(),
  payload: z.unknown().default(null),
  allowExclude: z.boolean().optional(),
  excluded: z.boolean().optional(),
  excludeReason: z.string().optional(),
})

const bodySchema = z.object({
  publicationType: z.enum(PUBLICATION_TYPES),
  subjectType: z.enum(["tour", "event"]),
  subjectId: z.string().uuid(),
  title: z.string().min(1).max(240),
  sourcePlanVersion: z.number().int().positive().default(1),
  sections: z.array(sectionSchema).min(1).max(40),
  candidates: z.array(candidateSchema).max(2000),
  channelAvailability: z.record(z.boolean()).optional(),
  activateTour: z.boolean().optional(),
  correlationId: z.string().optional(),
})

/** PUB-204 — Transactional publication commit (idempotent). */
export const POST = withAdminCapability("tour.publish", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const idempotencyKey =
      request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key")
    if (!idempotencyKey?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Idempotency-Key header is required.",
          code: "idempotency_required",
        },
        { status: 422 },
      )
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }

    const input = parsed.data
    if (input.activateTour && input.subjectType !== "tour") {
      return NextResponse.json(
        { success: false, error: "activateTour requires subjectType=tour" },
        { status: 400 },
      )
    }

    const assembly = assembleTransactionalPublish({
      publicationType: input.publicationType,
      orgId: admin.orgId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      title: input.title,
      sourcePlanVersion: input.sourcePlanVersion,
      sections: input.sections as any,
      candidates: input.candidates as any,
      channelAvailability: input.channelAvailability,
      lifecycleTourId: input.activateTour ? input.subjectId : null,
    })

    const { result } = await commitTransactionalPublication({
      supabase,
      orgId: admin.orgId,
      actorUserId: user.id,
      idempotencyKey,
      correlationId:
        request.headers.get("x-correlation-id") || input.correlationId || null,
      assembly,
    })

    return NextResponse.json({
      success: true,
      publication: result,
      alreadyExisted: result.alreadyExisted,
      preview: {
        recipientCount: assembly.audience.recipient_count,
        excludedCount: assembly.audience.excluded_count,
        deliveryCount: assembly.deliveries.length,
        checksum: assembly.snapshot.checksum,
      },
    })
  } catch (error: unknown) {
    if (error instanceof TransactionalPublishValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: "publication_invalid" },
        { status: 422 },
      )
    }
    if (error instanceof TransactionalPublishConflictError) {
      return NextResponse.json(
        { success: false, error: error.message, code: "idempotency_conflict" },
        { status: 409 },
      )
    }
    if (error instanceof TransactionalPublishAuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      )
    }
    const message = error instanceof Error ? error.message : "Transactional publish failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
