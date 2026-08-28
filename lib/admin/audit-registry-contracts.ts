import { z } from "zod"

export const AdminAuditStatusSchema = z.enum([
  "observed",
  "reproduced",
  "in_progress",
  "implemented",
  "ready_for_staging",
  "ready_for_independent_verification",
  "done",
])

export const AdminPrioritySchema = z.enum(["P0", "P1", "P2", "P3"])

export const AdminBlockerSchema = z
  .object({
    blockerId: z.string().min(1),
    reason: z.string().min(1),
    owner: z.string().min(1).nullable(),
    external: z.boolean().default(false),
    resolvedAt: z.string().datetime({ offset: true }).nullable().default(null),
  })
  .strict()

export const AdminPriorClaimSchema = z
  .object({
    source: z.string().min(1),
    claimedStatus: z.string().min(1),
    sourcePath: z.string().min(1),
    note: z.string().min(1).nullable().default(null),
  })
  .strict()

export const AdminFindingSchema = z
  .object({
    findingId: z.string().regex(/^(ADM-M-\d{3}|AOA-\d{3})$/),
    findingKind: z.enum(["product_or_technical", "audit_governance"]),
    sourceIds: z.array(z.string().min(1)).min(1),
    priority: AdminPrioritySchema,
    state: z.enum([
      "accessibility",
      "broken",
      "data_integrity",
      "design_debt",
      "inconsistent",
      "missing",
      "needs_verification",
      "partial",
      "performance",
      "process",
      "security",
    ]),
    domain: z.string().min(1),
    deliveryWave: z.number().int().min(0).max(6),
    sourcePhase: z.string().min(1).nullable(),
    title: z.string().min(1),
    problem: z.string().min(1),
    solution: z.string().min(1),
    acceptanceCriteria: z.array(z.string().min(1)).min(1),
    verificationRequirements: z.array(z.string().min(1)).min(1),
    dependsOn: z.array(z.string().min(1)).default([]),
    workflowIds: z.array(z.string().regex(/^ADM-WF-\d{3}$/)).min(1),
    specTaskIds: z.array(z.string().min(1)).default([]),
    launchGateIds: z.array(z.string().regex(/^LG-\d{2}$/)).default([]),
    riskIds: z.array(z.string().regex(/^RISK-\d{3}$/)).default([]),
    status: AdminAuditStatusSchema,
    blockers: z.array(AdminBlockerSchema).default([]),
    owner: z.string().min(1).nullable(),
    independentVerifier: z.string().min(1).nullable(),
    implementationCommit: z.string().regex(/^[0-9a-f]{40}$/).nullable(),
    evidenceIds: z.array(z.string().regex(/^EVD-[A-Z0-9-]+$/)).default([]),
    priorClaims: z.array(AdminPriorClaimSchema).default([]),
  })
  .strict()

export const AdminSpecTaskSchema = z
  .object({
    specTaskId: z.string().regex(/^[A-Z]+-\d{3}$/),
    order: z.number().int().positive(),
    specPhase: z.number().int().min(0).max(6),
    document: z.string().regex(/^\d{2}$/),
    title: z.string().min(1),
    dependsOn: z.array(z.string().regex(/^[A-Z]+-\d{3}$/)).default([]),
    phaseGate: z.number().int().min(0).max(5).nullable(),
    acceptanceCriteria: z.array(z.string().min(1)).min(1),
    workflowIds: z.array(z.string().regex(/^ADM-WF-\d{3}$/)).min(1),
    findingIds: z
      .array(z.string().regex(/^(ADM-M-\d{3}|AOA-\d{3})$/))
      .default([]),
    status: AdminAuditStatusSchema,
    blockers: z.array(AdminBlockerSchema).default([]),
    evidenceIds: z.array(z.string().regex(/^EVD-[A-Z0-9-]+$/)).default([]),
    priorClaims: z.array(AdminPriorClaimSchema).default([]),
  })
  .strict()

export const AdminActorSchema = z
  .object({
    personaId: z.string().regex(/^PER-\d{3}$/),
    organizationRelation: z.enum([
      "same_organization",
      "other_organization",
      "platform",
      "public_or_external",
      "technical_principal",
    ]),
    outcome: z.string().min(1),
  })
  .strict()

export const AdminWorkflowRecordSchema = z
  .object({
    workflowId: z.string().regex(/^ADM-WF-\d{3}$/),
    title: z.string().min(1),
    domain: z.string().min(1),
    deliveryWave: z.number().int().min(0).max(6),
    disposition: z.enum([
      "in_scope",
      "platform_internal",
      "disabled",
      "redirected",
      "retired",
    ]),
    producer: AdminActorSchema,
    recipients: z.array(AdminActorSchema).min(1),
    entryPoints: z.array(z.string().min(1)).default([]),
    routePatterns: z.array(z.string().min(1)).default([]),
    pagePatterns: z.array(z.string().min(1)).default([]),
    jobPatterns: z.array(z.string().min(1)).default([]),
    command: z
      .object({
        capability: z.string().min(1),
        actingContext: z.enum([
          "signed_server_session",
          "public_token",
          "service_principal",
          "not_applicable",
        ]),
        tenantTarget: z.string().min(1),
        idempotency: z.enum(["required", "not_applicable", "pending"]),
      })
      .strict(),
    dataBoundaries: z
      .object({
        tables: z.array(z.string().min(1)).default([]),
        rpcs: z.array(z.string().min(1)).default([]),
        storageBuckets: z.array(z.string().min(1)).default([]),
        rlsExpectation: z.string().min(1),
      })
      .strict(),
    sideEffects: z.array(z.string().min(1)).default([]),
    recipientVisibleResult: z.string().min(1),
    recovery: z
      .object({
        retry: z.string().min(1),
        reversal: z.string().min(1),
        partialFailure: z.string().min(1),
      })
      .strict(),
    auditEvent: z.string().min(1),
    requiredTestKinds: z
      .array(
        z.enum([
          "positive",
          "recipient",
          "cross_org",
          "tamper",
          "revoked",
          "unauthenticated",
          "direct_data_access",
          "idempotency",
          "retry",
          "rollback",
          "accessibility",
          "responsive",
        ]),
      )
      .min(1),
    findingIds: z
      .array(z.string().regex(/^(ADM-M-\d{3}|AOA-\d{3})$/))
      .default([]),
    specTaskIds: z.array(z.string().regex(/^[A-Z]+-\d{3}$/)).default([]),
    status: AdminAuditStatusSchema,
    blockers: z.array(AdminBlockerSchema).default([]),
    owner: z.string().min(1).nullable(),
    independentVerifier: z.string().min(1).nullable(),
    implementationCommit: z.string().regex(/^[0-9a-f]{40}$/).nullable(),
    evidenceIds: z.array(z.string().regex(/^EVD-[A-Z0-9-]+$/)).default([]),
  })
  .strict()

export const AdminEvidenceSchema = z
  .object({
    evidenceId: z.string().regex(/^EVD-[A-Z0-9-]+$/),
    kind: z.enum([
      "commit",
      "test_run",
      "ci_run",
      "migration_apply",
      "schema_diff",
      "rls_matrix",
      "api_capture",
      "screenshot",
      "accessibility",
      "performance",
      "retry_recovery",
      "rollback",
      "product_signoff",
      "security_signoff",
      "independent_verification",
    ]),
    result: z.enum(["pass", "fail", "informational"]),
    environment: z.enum(["local", "ci", "staging", "production"]),
    capturedAt: z.string().datetime({ offset: true }),
    capturedBy: z.string().min(1),
    commitSha: z.string().regex(/^[0-9a-f]{40}$/).nullable(),
    artifact: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
    findingIds: z
      .array(z.string().regex(/^(ADM-M-\d{3}|AOA-\d{3})$/))
      .default([]),
    workflowIds: z.array(z.string().regex(/^ADM-WF-\d{3}$/)).default([]),
    specTaskIds: z.array(z.string().regex(/^[A-Z]+-\d{3}$/)).default([]),
    launchGateIds: z.array(z.string().regex(/^LG-\d{2}$/)).default([]),
    notes: z.string().min(1).nullable(),
  })
  .strict()

export const LaunchGateSchema = z
  .object({
    gateId: z.string().regex(/^LG-\d{2}$/),
    title: z.string().min(1),
    required: z.boolean(),
    deliveryWave: z.number().int().min(0).max(6),
    checkKind: z.enum([
      "command",
      "finding_query",
      "workflow_query",
      "evidence_query",
      "human_signoff",
    ]),
    command: z.string().min(1).nullable(),
    acceptance: z.string().min(1),
    requiredEvidenceKinds: z.array(AdminEvidenceSchema.shape.kind).default([]),
    dependsOn: z.array(z.string().regex(/^LG-\d{2}$/)).default([]),
    ownerRole: z.string().min(1),
  })
  .strict()

export const RiskRecordSchema = z
  .object({
    riskId: z.string().regex(/^RISK-\d{3}$/),
    title: z.string().min(1),
    impact: z.number().int().min(1).max(5),
    likelihood: z.number().int().min(1).max(5),
    mitigation: z.string().min(1),
    trigger: z.string().min(1),
    contingency: z.string().min(1),
    owner: z.string().min(1).nullable(),
    status: z.enum(["open", "mitigating", "accepted", "closed"]),
    evidenceIds: z.array(z.string().regex(/^EVD-[A-Z0-9-]+$/)).default([]),
  })
  .strict()

export const AdminPersonaSchema = z
  .object({
    personaId: z.string().regex(/^PER-\d{3}$/),
    title: z.string().min(1),
    actorClass: z.enum(["human", "external_human", "technical"]),
    organizationScope: z.enum([
      "organization",
      "cross_organization_negative",
      "platform",
      "none",
    ]),
    expectedCapabilities: z.array(z.string().min(1)).default([]),
    expectedDenials: z.array(z.string().min(1)).default([]),
  })
  .strict()

export const AdminDecisionSchema = z
  .object({
    decisionId: z.string().regex(/^ADM-DEC-\d{3}$/),
    sourceAlias: z.string().min(1).nullable(),
    topic: z.string().min(1),
    decision: z.string().min(1),
    rationale: z.string().min(1),
    status: z.literal("accepted"),
    owner: z.string().min(1),
  })
  .strict()

export type AdminAuditStatus = z.infer<typeof AdminAuditStatusSchema>
export type AdminFinding = z.infer<typeof AdminFindingSchema>
export type AdminSpecTask = z.infer<typeof AdminSpecTaskSchema>
export type AdminWorkflowRecord = z.infer<typeof AdminWorkflowRecordSchema>
export type AdminEvidence = z.infer<typeof AdminEvidenceSchema>
export type LaunchGate = z.infer<typeof LaunchGateSchema>
export type RiskRecord = z.infer<typeof RiskRecordSchema>
export type AdminPersona = z.infer<typeof AdminPersonaSchema>
export type AdminDecision = z.infer<typeof AdminDecisionSchema>
