import assert from "node:assert/strict"
import test from "node:test"

import { validateToolchain } from "./check-toolchain.mjs"

const valid = {
  nodeVersion: "v20.19.0",
  userAgent: "npm/11.5.2 node/v20.19.0 darwin arm64 workspaces/false",
  legacyPeerDeps: "false",
  lockfileExists: true,
  lockfileVersion: 3,
  packageManager: "npm@11.5.2",
  nodeEngine: "20.x",
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
