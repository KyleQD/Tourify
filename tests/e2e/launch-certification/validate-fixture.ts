import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  assertCertificationFixtureReady,
  requiredEnvironment,
  validateLaunchCertificationFixture,
} from "./fixture"

const configuredPath = process.argv[2]
if (!configuredPath) throw new Error("Usage: validate-fixture.ts <fixture.json>")

const fixturePath = resolve(process.cwd(), configuredPath)
const fixture = assertCertificationFixtureReady(
  validateLaunchCertificationFixture(JSON.parse(readFileSync(fixturePath, "utf8"))),
)

console.log(
  JSON.stringify(
    {
      fixture: fixturePath,
      browserJourneys: fixture.browserJourneys.length,
      apiScenarios: fixture.apiScenarios.length,
      requiredEnvironment: requiredEnvironment(fixture),
    },
    null,
    2,
  ),
)
