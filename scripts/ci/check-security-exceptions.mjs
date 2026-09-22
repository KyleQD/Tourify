#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_REGISTRY = "security/security-scan-exceptions.json";
const REQUIRED_STRING_FIELDS = [
  "id",
  "scanner",
  "finding",
  "owner",
  "rationale",
  "issue",
  "expiresAt",
  "mitigation",
];
const EXPLOITABILITY_DECISIONS = new Set([
  "not_exploitable",
  "mitigated",
  "production_blocked",
]);

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

export function validateSecurityExceptionRegistry(registry, now = new Date()) {
  const errors = [];
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return ["Registry must be a JSON object"];
  }
  if (registry.version !== 1) errors.push("Registry version must be 1");
  if (!Array.isArray(registry.exceptions)) {
    errors.push("Registry exceptions must be an array");
    return errors;
  }

  const ids = new Set();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  registry.exceptions.forEach((exception, index) => {
    const label = nonEmptyString(exception?.id)
      ? exception.id
      : `exceptions[${index}]`;
    if (
      !exception ||
      typeof exception !== "object" ||
      Array.isArray(exception)
    ) {
      errors.push(`${label}: exception must be an object`);
      return;
    }
    for (const field of REQUIRED_STRING_FIELDS) {
      if (!nonEmptyString(exception[field]))
        errors.push(`${label}: ${field} is required`);
    }

    if (nonEmptyString(exception.id)) {
      if (ids.has(exception.id)) errors.push(`${label}: duplicate id`);
      ids.add(exception.id);
    }

    const expiry = parseDateOnly(exception.expiresAt);
    if (!expiry)
      errors.push(`${label}: expiresAt must be a valid YYYY-MM-DD date`);
    else if (expiry <= today) errors.push(`${label}: exception is expired`);

    const review = exception.productionExploitability;
    if (!review || typeof review !== "object" || Array.isArray(review)) {
      errors.push(`${label}: productionExploitability review is required`);
      return;
    }
    if (!EXPLOITABILITY_DECISIONS.has(review.decision)) {
      errors.push(
        `${label}: productionExploitability.decision must be not_exploitable, mitigated, or production_blocked`,
      );
    }
    for (const field of ["rationale", "reviewedBy", "reviewedAt"]) {
      if (!nonEmptyString(review[field])) {
        errors.push(`${label}: productionExploitability.${field} is required`);
      }
    }
    if (
      nonEmptyString(review.reviewedAt) &&
      !parseDateOnly(review.reviewedAt)
    ) {
      errors.push(
        `${label}: productionExploitability.reviewedAt must be YYYY-MM-DD`,
      );
    }
  });

  return errors;
}

export function main(argv = process.argv.slice(2)) {
  const registryPath = path.resolve(process.cwd(), argv[0] || DEFAULT_REGISTRY);
  let registry;
  try {
    registry = JSON.parse(readFileSync(registryPath, "utf8"));
  } catch (error) {
    console.error(
      `Unable to read security exception registry: ${error.message}`,
    );
    return 1;
  }
  const errors = validateSecurityExceptionRegistry(registry);
  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    return 1;
  }
  console.log(
    `Security exception registry OK — ${registry.exceptions.length} active exception(s)`,
  );
  return 0;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) process.exitCode = main();
