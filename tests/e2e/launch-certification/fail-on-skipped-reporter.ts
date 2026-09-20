import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter"

export default class FailOnSkippedReporter implements Reporter {
  private skipped = new Set<string>()

  onBegin(_config: FullConfig, suite: Suite) {
    for (const test of suite.allTests()) {
      if (test.expectedStatus === "skipped") this.skipped.add(test.titlePath().join(" > "))
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === "skipped") this.skipped.add(test.titlePath().join(" > "))
  }

  async onEnd(result: FullResult): Promise<{ status: FullResult["status"] } | void> {
    if (this.skipped.size === 0) return
    console.error(
      `Launch certification forbids skipped tests:\n${[...this.skipped]
        .sort()
        .map((title) => `- ${title}`)
        .join("\n")}`,
    )
    return { status: "failed" }
  }
}
