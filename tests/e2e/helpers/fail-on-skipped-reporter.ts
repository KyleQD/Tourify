import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter"

/**
 * Turn any skipped test into a failed run.
 *
 * A Playwright run where every test skips still exits 0. That is fail-open for a
 * certification-style gate: an unrun journey reports the same as a proven one.
 * This reporter makes a skip a hard failure and prints the remediation reason so
 * the operator can see which prerequisite was missing.
 *
 * QA-003 acceptance criteria require "no accidental skips".
 */
export interface FailOnSkippedReporterOptions {
  /** Human label used in the failure message, e.g. "PR E2E". */
  label?: string
}

export default class FailOnSkippedReporter implements Reporter {
  private readonly skipped = new Map<string, string>()
  private readonly label: string

  constructor(options: FailOnSkippedReporterOptions = {}) {
    this.label = options.label ?? "This suite"
  }

  onBegin(_config: FullConfig, suite: Suite) {
    // A test skipped by an unconditional `test.skip` condition is never executed,
    // so onTestEnd never fires for it. onBegin is the only place it is visible.
    for (const test of suite.allTests()) {
      if (test.expectedStatus === "skipped") {
        this.skipped.set(test.titlePath().join(" > "), "skipped before execution")
      }
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === "skipped") {
      const reason = (test.annotations ?? [])
        .map((a) => a.description)
        .filter((d): d is string => Boolean(d))
        .join("; ")
      this.skipped.set(test.titlePath().join(" > "), reason || "skipped during execution")
    }
  }

  async onEnd(_result: FullResult): Promise<{ status: FullResult["status"] } | void> {
    if (this.skipped.size === 0) return
    const lines = [...this.skipped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, reason]) => `- ${title}${reason ? ` (${reason})` : ""}`)
    console.error(
      [
        `${this.label} forbids skipped tests: ${this.skipped.size} skipped.`,
        `A skipped journey is not a passed journey. Provision the prerequisite named above,`,
        `or record an explicit scope decision, then rerun.`,
        ...lines,
      ].join("\n"),
    )
    return { status: "failed" }
  }
}
