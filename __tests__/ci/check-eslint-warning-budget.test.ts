import { describe, expect, it } from "vitest"

import {
  compareWarningBudget,
  normalizeEslintResults,
  validateExceptions,
} from "../../scripts/ci/check-eslint-warning-budget.mjs"

describe("ESLint warning budget", () => {
  it("normalizes warnings by repository-relative path and rule", () => {
    const result = normalizeEslintResults([
      {
        filePath: "/repo/app/a.tsx",
        messages: [
          { severity: 1, ruleId: "react/test", message: "warning" },
          { severity: 1, ruleId: "react/test", message: "warning" },
          { severity: 2, ruleId: "security/test", message: "error" },
        ],
      },
    ], "/repo")
    expect(result.warnings).toEqual({ "app/a.tsx::react/test": 2 })
    expect(result.errors).toHaveLength(1)
  })

  it("accepts reductions and rejects new or increased warning tuples", () => {
    expect(compareWarningBudget({
      current: { "a.ts::rule": 1 },
      baseline: { "a.ts::rule": 2 },
    })).toEqual([])
    expect(compareWarningBudget({
      current: { "a.ts::rule": 3, "b.ts::rule": 1 },
      baseline: { "a.ts::rule": 2 },
    })).toEqual([
      { key: "a.ts::rule", baseline: 2, current: 3, allowed: 2 },
      { key: "b.ts::rule", baseline: 0, current: 1, allowed: 0 },
    ])
  })

  it("requires owned, reasoned, tracked, unexpired exceptions", () => {
    expect(validateExceptions([{
      path: "app/a.tsx",
      ruleId: "react/test",
      allowedCount: 1,
      owner: "Admin UI",
      rationale: "Temporary migration",
      issue: "REL-007",
      expiresOn: "2026-12-01",
    }], "2026-07-21")).toEqual([])
    expect(validateExceptions([{
      path: "app/a.tsx",
      ruleId: "react/test",
      allowedCount: 1,
      owner: "",
      rationale: "Temporary migration",
      issue: "REL-007",
      expiresOn: "2026-01-01",
    }], "2026-07-21")).toEqual(expect.arrayContaining([
      expect.stringContaining("owner"),
      expect.stringContaining("expired"),
    ]))
  })
})
