import { describe, expect, it } from "vitest"
import { readPromotedMigration } from "./quarantined-migration-history"

import {
  isPublicationAudienceClass,
  isPublicationType,
  PUBLICATION_SCHEMA_RELATIONS,
  PUBLICATION_SCHEMA_TABLES,
  resolveSnapshotAccessClassification,
} from "@/lib/admin/publication-schema"

describe("PUB-102 publication schema contract", () => {
  it("covers required relations with org scope and outbox linkage", () => {
    expect(PUBLICATION_SCHEMA_TABLES).toEqual(
      expect.arrayContaining([
        "admin_publication_snapshots",
        "admin_publication_sections",
        "admin_publication_audiences",
        "admin_publication_recipients",
        "admin_publication_deliveries",
        "admin_publication_acknowledgements",
        "admin_publication_share_tokens",
        "admin_publication_access_logs",
        "admin_publication_ownership_quarantine",
        "admin_publication_outbox",
      ]),
    )

    expect(PUBLICATION_SCHEMA_RELATIONS.every((r) => r.orgScoped)).toBe(true)
    expect(
      PUBLICATION_SCHEMA_RELATIONS.filter((r) => r.relatesToOutbox).map((r) => r.table),
    ).toEqual(
      expect.arrayContaining([
        "admin_publication_snapshots",
        "admin_publication_deliveries",
        "admin_publication_outbox",
      ]),
    )
  })

  it("validates publication types and audience classes from PUB-001/PUB-002", () => {
    expect(isPublicationType("day_sheet")).toBe(true)
    expect(isPublicationType("random")).toBe(false)
    expect(isPublicationAudienceClass("sensitive_traveler")).toBe(true)
    expect(isPublicationAudienceClass("secret")).toBe(false)
  })

  it("elevates snapshot access classification to the most sensitive section", () => {
    expect(resolveSnapshotAccessClassification(["worker", "public"])).toBe("worker")
    expect(
      resolveSnapshotAccessClassification(["worker", "financial", "personnel"]),
    ).toBe("financial")
    expect(
      resolveSnapshotAccessClassification(["financial", "sensitive_traveler"]),
    ).toBe("sensitive_traveler")
    expect(resolveSnapshotAccessClassification([])).toBe("worker")
  })

  it("promotes the reviewed ADR-005 immutability contract unchanged", () => {
    const sql = readPromotedMigration(
      "20260721215705_admin_publication_snapshot_immutability_adr005.sql",
    )

    expect(sql).toContain("guard_admin_publication_snapshot_update")
    expect(sql).toContain("Committed publication snapshot content is immutable")
    expect(sql).toContain("status = 'draft'")
    expect(sql).toContain("'tour.publish'")
    expect(sql).toContain("admin_publication_sections.snapshot_id")
    expect(sql).toContain("admin_publication_audiences.snapshot_id")
    expect(sql).toContain("admin_publication_recipients.snapshot_id")
    expect(sql).not.toMatch(/\btruncate\b|\bdrop\s+table\b/i)
  })

  it("promotes the reviewed parent-scope and sensitive-read contract unchanged", () => {
    const sql = readPromotedMigration(
      "20260721221811_admin_publication_parent_scope_rls_pub102.sql",
    )

    expect(sql).toContain("admin_publication_ownership_quarantine")
    expect(sql).toContain("foreign key (snapshot_id, org_id)")
    expect(sql).toContain("foreign key (recipient_id, org_id)")
    expect(sql).toContain("references public.tours (id, org_id) not valid")
    expect(sql).toContain("references public.events_v2 (id, org_id) not valid")
    expect(sql).toContain("validate constraint")
    expect(sql).toContain("public.can_publication(auth.uid(), org_id, 'tour.publish')")
    expect(sql).toContain("r.subject_key = auth.uid()::text")
    expect(sql).not.toMatch(/\btruncate\b|\bdrop\s+table\b|\bdelete\s+from\b/i)
  })
})
