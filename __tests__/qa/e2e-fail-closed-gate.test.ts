/**
 * Wave 32 regression lock for the pull-request E2E gate.
 *
 * On 2026-09-22 the `E2E Tests (Playwright)` job on d2176904 ran for the full
 * 30m20s and reported only "cancelled". The real cause was not a test: the
 * preceding `Build app` step never finished, so GitHub skipped `Start app`,
 * `Wait for app`, `Run E2E tests` and the artifact upload. Zero Playwright
 * tests ran. `npm run build` invokes `next build`, and next.config.ts sets
 * `eslint.ignoreDuringBuilds: false` and `typescript.ignoreBuildErrors: false`,
 * so the build performs a full-repo ESLint and a full `tsc --noEmit` inline.
 * The `ci.yml` "Lint And Build" job measured Lint at 48s and Typecheck at
 * 68m18s on the same SHA, which cannot fit a 30m job.
 *
 * These assertions lock the fail-closed, attributable behaviour of the gate.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import FailOnSkippedReporter from "../../tests/e2e/helpers/fail-on-skipped-reporter"

const ROOT = process.cwd()
const workflow = readFileSync(resolve(ROOT, ".github/workflows/e2e.yml"), "utf8")
const playwrightConfig = readFileSync(resolve(ROOT, "playwright.config.ts"), "utf8")

const e2eJob = workflow.slice(
  workflow.indexOf("  e2e:\n"),
  workflow.indexOf("  launch-certification:\n"),
)

/** Return the `timeout-minutes: N` that applies to the named step. */
function stepTimeout(stepName: string): number | null {
  const at = e2eJob.indexOf(`name: ${stepName}`)
  if (at === -1) return null
  const block = e2eJob.slice(at, e2eJob.indexOf("- name:", at + 1) === -1 ? undefined : e2eJob.indexOf("- name:", at + 1))
  const match = block.match(/timeout-minutes:\s*(\d+)/)
  return match ? Number(match[1]) : null
}

function jobTimeout(): number {
  const match = e2eJob.match(/^\s{4}timeout-minutes:\s*(\d+)/m)
  if (!match) throw new Error("e2e job has no timeout-minutes")
  return Number(match[1])
}

describe("PR E2E workflow budgets", () => {
  it("gives the job a budget larger than the measured inline typecheck cost", () => {
    // ci.yml "Lint And Build" measured Typecheck at 68m18s on this SHA, and
    // next build adds ~3m of webpack compile on top of it.
    expect(jobTimeout()).toBeGreaterThan(80)
  })

  it("caps the build step so a hang is attributed to Build app, not the whole job", () => {
    const build = stepTimeout("Build app")
    expect(build).not.toBeNull()
    expect(build as number).toBeGreaterThan(70)
    expect(build as number).toBeLessThan(jobTimeout())
  })

  it("caps the server wait and the test run as named steps", () => {
    expect(stepTimeout("Wait for app")).not.toBeNull()
    expect(stepTimeout("Run E2E tests")).not.toBeNull()
  })

  it("leaves headroom so the job cap is not what ends the run", () => {
    const build = stepTimeout("Build app") as number
    const tests = stepTimeout("Run E2E tests") as number
    expect(build + tests + 5).toBeLessThan(jobTimeout())
  })
})

describe("PR E2E workflow fail-closed behaviour", () => {
  it("does not silently fall back from a hosted target to localhost", () => {
    // `${{ secrets.STAGING_URL || 'http://localhost:3000' }}` retargeted the
    // mutating specs at a hosted host whenever STAGING_URL existed, while
    // `environment: staging` secrets stayed loaded.
    expect(e2eJob).not.toMatch(/secrets\.STAGING_URL\s*\|\|/)
    expect(e2eJob).toMatch(/PLAYWRIGHT_BASE_URL:\s*http:\/\/localhost:3000/)
  })

  it("refuses a hosted target before the expensive build runs", () => {
    expect(e2eJob).toContain("Refuse a hosted E2E target (fail closed)")
    const guard = e2eJob.indexOf("Refuse a hosted E2E target (fail closed)")
    const build = e2eJob.indexOf("name: Build app")
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(build)
    expect(e2eJob).toContain("Launch Certification (exact staging SHA)")
  })

  it("retains the build log so a build failure stays diagnosable", () => {
    expect(e2eJob).toMatch(/tee build-app\.log/)
    expect(e2eJob).toMatch(/build-app\.log/)
  })

  it("does not carry a step-level NODE_OPTIONS that the build script overrides", () => {
    // `npm run build` hardcodes NODE_OPTIONS='--max-old-space-size=6144' inline.
    expect(e2eJob).not.toMatch(/NODE_OPTIONS:\s*'--max-old-space-size=4096'/)
  })
})

describe("playwright.config.ts fail-closed behaviour", () => {
  it("bounds the whole run so a hang cannot silently eat the job budget", () => {
    expect(playwrightConfig).toMatch(/globalTimeout:\s*GLOBAL_TIMEOUT_MS/)
    expect(playwrightConfig).toMatch(/const GLOBAL_TIMEOUT_MS = \d+ \* 60_000/)
  })

  it("fails the run when any test is skipped", () => {
    expect(playwrightConfig).toContain("fail-on-skipped-reporter.ts")
  })

  it("keeps the report in the directory the workflow uploads", () => {
    expect(playwrightConfig).toContain('outputFolder: "playwright-report"')
    expect(playwrightConfig).toContain('open: "never"')
  })
})

describe("FailOnSkippedReporter", () => {
  const fakeTest = (title: string, expectedStatus: string, annotations: unknown[] = []) =>
    ({ titlePath: () => ["suite", title], expectedStatus, annotations }) as never

  it("fails the run when a test is skipped during execution", async () => {
    const reporter = new FailOnSkippedReporter({ label: "PR E2E" })
    reporter.onBegin({} as never, { allTests: () => [] } as never)
    reporter.onTestEnd(
      fakeTest("west coast tour", "passed"),
      { status: "skipped", annotations: [{ type: "skip", description: "Run npm run qa:seed:flow first" }] } as never,
    )
    const outcome = await reporter.onEnd({} as never)
    expect(outcome).toEqual({ status: "failed" })
  })

  it("fails the run when a test is skipped before it ever executes", async () => {
    const reporter = new FailOnSkippedReporter()
    reporter.onBegin(
      {} as never,
      { allTests: () => [fakeTest("west coast tour", "skipped")] } as never,
    )
    const outcome = await reporter.onEnd({} as never)
    expect(outcome).toEqual({ status: "failed" })
  })

  it("leaves an all-passed run green", async () => {
    const reporter = new FailOnSkippedReporter()
    reporter.onBegin(
      {} as never,
      { allTests: () => [fakeTest("a", "passed"), fakeTest("b", "passed")] } as never,
    )
    reporter.onTestEnd(fakeTest("a", "passed"), { status: "passed" } as never)
    reporter.onTestEnd(fakeTest("b", "passed"), { status: "passed" } as never)
    expect(await reporter.onEnd({} as never)).toBeUndefined()
  })

  it("still fails when one test is skipped and another passed", async () => {
    const reporter = new FailOnSkippedReporter()
    reporter.onBegin({} as never, { allTests: () => [] } as never)
    reporter.onTestEnd(fakeTest("a", "passed"), { status: "passed" } as never)
    reporter.onTestEnd(fakeTest("b", "passed"), { status: "skipped" } as never)
    expect(await reporter.onEnd({} as never)).toEqual({ status: "failed" })
  })
})
