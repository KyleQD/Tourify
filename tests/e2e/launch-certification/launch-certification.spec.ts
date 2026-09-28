import { expect, test } from "@playwright/test"
import {
  assertCertificationFixtureReady,
  loadLaunchCertificationFixture,
  expandTemplates,
  readJsonPath,
} from "./fixture"
import {
  actorToken,
  assertAccessible,
  assertJsonAssertions,
  assertResponsive,
  executeRequestStep,
  injectActorSession,
} from "./helpers"

const fixture = assertCertificationFixtureReady(loadLaunchCertificationFixture())

test.describe("@surface core browser journeys", () => {
  for (const journey of fixture.browserJourneys) {
    test(`${journey.area}: ${journey.name}`, async ({ page }, testInfo) => {
      const baseURL = String(testInfo.project.use.baseURL)
      if (journey.actor)
        await injectActorSession(page.context(), baseURL, fixture, fixture.actors[journey.actor])

      const startedAt = Date.now()
      const response = await page.goto(expandTemplates(journey.path, {}), { waitUntil: "domcontentloaded" })
      const elapsedMs = Date.now() - startedAt
      expect(response, `${journey.name} produced no navigation response`).not.toBeNull()
      expect(response!.status(), `${journey.name} returned ${response!.status()}`).toBeLessThan(400)
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
      if (journey.expectedUrl)
        await expect(page).toHaveURL(new RegExp(expandTemplates(journey.expectedUrl, {})))
      if (journey.expectedText)
        await expect(page.locator("body")).toContainText(
          new RegExp(expandTemplates(journey.expectedText, {}), "i"),
        )
      if (journey.performanceBudgetMs)
        expect(elapsedMs, `${journey.name} DOMContentLoaded budget`).toBeLessThanOrEqual(
          journey.performanceBudgetMs,
        )
      if (journey.responsive) await assertResponsive(page)
      if (journey.accessibility) await assertAccessible(page)
    })
  }
})

test.describe.serial("@lifecycle deterministic API certification", () => {
  for (const scenario of fixture.apiScenarios) {
    test(`${scenario.area}: ${scenario.name}`, async ({ request }) => {
      const captures: Record<string, unknown> = {}
      const token = scenario.actor
        ? (await actorToken(fixture, fixture.actors[scenario.actor])).access_token
        : undefined

      if (scenario.mode === "sequence") {
        for (const step of scenario.steps)
          await test.step(step.name, () => executeRequestStep({ request, step, token, captures }))
        return
      }

      if (scenario.mode === "replay") {
        const results = []
        for (let attempt = 0; attempt < scenario.repetitions; attempt += 1)
          results.push(await executeRequestStep({ request, step: scenario.request, token, captures }))
        expect(results.map((result) => result.status)).toEqual(
          Array.from({ length: scenario.repetitions }, () => scenario.request.expectedStatuses[0]),
        )
        assertJsonAssertions(results.at(-1)?.json, scenario.finalAssertions)
        return
      }

      const results = await Promise.all(
        Array.from({ length: scenario.attempts }, () =>
          executeRequestStep({ request, step: scenario.request, token, captures: {} }),
        ),
      )
      const counts = results.reduce<Record<string, number>>((acc, result) => {
        acc[String(result.status)] = (acc[String(result.status)] ?? 0) + 1
        return acc
      }, {})
      expect(counts).toEqual(scenario.expectedStatusCounts)
      for (const path of scenario.stableJsonPaths ?? []) {
        const values = results.map((result) => readJsonPath(result.json, path))
        expect(new Set(values.map((value) => JSON.stringify(value))).size, `${path} changed across the race`).toBe(1)
      }
    })
  }
})
