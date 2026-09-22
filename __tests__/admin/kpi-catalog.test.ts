import { describe, expect, it } from "vitest";

import {
  CANONICAL_KPI_CATALOG,
  KPI_CATALOG,
  KPI_CATALOG_TEMPLATE_FIELDS,
  LEGACY_KPI_CATALOG,
  kpiCatalogStats,
  validateKpiCatalog,
} from "@/lib/admin/kpi-catalog";
import { REPORTING_CONSUMERS } from "@/lib/admin/reporting-consumer-inventory";

describe("REP-001 KPI catalog", () => {
  it("covers every inventoried reporting consumer without duplicate ids or incomplete records", () => {
    expect(validateKpiCatalog()).toEqual([]);
    expect(LEGACY_KPI_CATALOG).toHaveLength(REPORTING_CONSUMERS.length);
    expect(new Set(KPI_CATALOG.map((entry) => entry.kpiId)).size).toBe(KPI_CATALOG.length);
    expect(KPI_CATALOG_TEMPLATE_FIELDS.length).toBeGreaterThanOrEqual(24);
  });

  it("fully documents canonical seed definitions", () => {
    expect(CANONICAL_KPI_CATALOG).toHaveLength(8);
    for (const kpi of CANONICAL_KPI_CATALOG) {
      expect(kpi.businessQuestion).not.toBe("");
      expect(kpi.formula).not.toBe("");
      expect(kpi.inclusionRules.length).toBeGreaterThan(0);
      expect(kpi.exclusionRules.length).toBeGreaterThan(0);
      expect(kpi.sourceEntities.length).toBeGreaterThan(0);
      expect(kpi.sourceStatuses.length).toBeGreaterThan(0);
      expect(kpi.requiredCapabilities.length).toBeGreaterThan(0);
      expect(kpi.reconciliationTest).not.toBe("");
    }
  });

  it("flags duplicate/conflicting legacy families instead of presenting them as governed", () => {
    expect(LEGACY_KPI_CATALOG.every((entry) => entry.governanceStatus === "legacy_conflict")).toBe(true);
    expect(LEGACY_KPI_CATALOG.every((entry) => entry.governanceFlags.includes("conflicting_definition"))).toBe(true);
    expect(kpiCatalogStats().flaggedDuplicateCandidates).toBeGreaterThan(0);
  });

  it("detects duplicate ids and uncovered consumers", () => {
    const duplicate = [...KPI_CATALOG, KPI_CATALOG[0]];
    expect(validateKpiCatalog(duplicate).some((issue) => issue.code === "duplicate_kpi_id")).toBe(true);
    expect(validateKpiCatalog([], REPORTING_CONSUMERS.slice(0, 1))).toEqual([
      expect.objectContaining({ code: "uncovered_reporting_consumer" }),
    ]);
  });
});
