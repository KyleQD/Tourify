import assert from "node:assert/strict";
import test from "node:test";

import { validateSecurityExceptionRegistry } from "./check-security-exceptions.mjs";

const NOW = new Date("2026-07-21T12:00:00.000Z");

function validException(overrides = {}) {
  return {
    id: "SEC-EX-001",
    scanner: "codeql",
    finding: "js/example-finding",
    owner: "platform-security",
    rationale:
      "The vulnerable path is not reachable in the deployed application.",
    issue: "SEC-1234",
    expiresAt: "2026-08-21",
    mitigation:
      "Keep the affected feature disabled and alert on attempted access.",
    productionExploitability: {
      decision: "not_exploitable",
      rationale: "Production has no route to the affected module.",
      reviewedBy: "security-reviewer",
      reviewedAt: "2026-07-21",
    },
    ...overrides,
  };
}

test("accepts an empty registry and a complete active exception", () => {
  assert.deepEqual(
    validateSecurityExceptionRegistry({ version: 1, exceptions: [] }, NOW),
    [],
  );
  assert.deepEqual(
    validateSecurityExceptionRegistry(
      { version: 1, exceptions: [validException()] },
      NOW,
    ),
    [],
  );
});

test("requires governance and production exploitability fields", () => {
  for (const field of [
    "owner",
    "rationale",
    "issue",
    "expiresAt",
    "mitigation",
  ]) {
    const exception = validException({ [field]: "" });
    const errors = validateSecurityExceptionRegistry(
      { version: 1, exceptions: [exception] },
      NOW,
    );
    assert.ok(
      errors.some((error) => error.includes(`${field} is required`)),
      field,
    );
  }

  const errors = validateSecurityExceptionRegistry(
    {
      version: 1,
      exceptions: [validException({ productionExploitability: null })],
    },
    NOW,
  );
  assert.ok(
    errors.some((error) =>
      error.includes("productionExploitability review is required"),
    ),
  );
});

test("rejects expired exceptions, duplicate ids, and unsupported decisions", () => {
  const expired = validException({ expiresAt: "2026-07-21" });
  const unsupported = validException({
    id: "SEC-EX-002",
    productionExploitability: {
      ...validException().productionExploitability,
      decision: "unknown",
    },
  });
  const errors = validateSecurityExceptionRegistry(
    { version: 1, exceptions: [expired, expired, unsupported] },
    NOW,
  );
  assert.ok(errors.some((error) => error.includes("exception is expired")));
  assert.ok(errors.some((error) => error.includes("duplicate id")));
  assert.ok(errors.some((error) => error.includes("decision must be")));
});
