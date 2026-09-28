import assert from "node:assert/strict"
import test from "node:test"

import { validateToolchain } from "./check-toolchain.mjs"

const valid = {
  nodeVersion: "v24.19.0",
  userAgent: "npm/11.17.0 node/v24.19.0 darwin arm64 workspaces/false",
  legacyPeerDeps: "false",
  lockfileExists: true,
  lockfileVersion: 3,
  packageManager: "npm@11.17.0",
  nodeEngine: "24.x",
  npmEngine: "11.17.0",
}

test("accepts the supported npm/Node/lockfile contract", () => {
  assert.deepEqual(validateToolchain(valid), [])
})

test("rejects unsupported runtime, package manager, and legacy peer bypass", () => {
  const failures = validateToolchain({
    ...valid,
    nodeVersion: "v22.0.0",
    userAgent: "yarn/4.0.0 npm/? node/v22.0.0",
    legacyPeerDeps: "true",
    packageManager: "pnpm@9.0.0",
    lockfileVersion: 2,
  })
  assert.equal(failures.length, 5)
})

test("rejects an npm version that differs from the pinned package manager", () => {
  const failures = validateToolchain({
    ...valid,
    userAgent: "npm/11.16.1 node/v24.19.0 darwin arm64 workspaces/false",
  })
  assert.deepEqual(failures, ["npm 11.17.0 is required; received 11.16.1"])
})
