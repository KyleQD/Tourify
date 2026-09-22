import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const yaml = require("js-yaml")
const workflow = (name) => yaml.load(readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8"))

test("production can only deploy through protected manual exact-SHA promotion", () => {
  const production = workflow("deploy-production.yml")
  assert.deepEqual(Object.keys(production.on), ["workflow_dispatch"])
  assert.equal(production.jobs.deploy.environment, "production")
  const steps = production.jobs.deploy.steps.map((step) => step.name)
  assert(steps.includes("Require matching successful CI, E2E, security, staging, and certification runs"))
  assert(steps.includes("Download and verify staging deployment evidence"))
  assert(steps.indexOf("Download and verify staging deployment evidence") < steps.indexOf("Deploy exact prebuilt production artifact"))
  assert.match(production.jobs.deploy.steps.find((step) => step.name === "Require matching successful CI, E2E, security, staging, and certification runs").run, /--event push --commit/)
})

test("main SHA has an ordinary E2E run before staging and a protected certification run after it", () => {
  const e2e = workflow("e2e.yml")
  const staging = workflow("deploy-demo.yml")
  assert.deepEqual(e2e.on.push.branches, ["main"])
  assert.equal(e2e.jobs["launch-certification"].environment, "staging")
  assert.deepEqual(Object.keys(staging.on), ["workflow_dispatch"])
  assert.equal(staging.jobs.deploy.environment, "staging")
  assert.match(staging.jobs.deploy.steps.find((step) => step.name === "Require successful CI, E2E, and security runs for the SHA").run, /--event push --commit/)
})
