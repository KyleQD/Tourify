#!/usr/bin/env node
/**
 * REL-103 / SEC-104 — exact Admin API route-method contract validation.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, "lib/admin/api-route-registry.ts");
const BASELINE = path.join(
  ROOT,
  "scripts/ci/admin-route-registry-baseline.json",
);
const ADMIN_API = path.join(ROOT, "app/api/admin");
const HTTP_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);
const METHOD_CONTRACT_FIELDS = [
  "route",
  "method",
  "actingContext",
  "capabilities",
  "capabilityMode",
  "requestSchema",
  "responseSchema",
  "idempotency",
  "audit",
  "owner",
  "legacy",
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

function toApiPath(file) {
  const relative = path
    .relative(path.join(ROOT, "app"), file)
    .replace(/\\/g, "/");
  return "/" + relative.replace(/\/route\.ts$/, "");
}

function hasExportModifier(node) {
  return (
    node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) === true
  );
}

export function exportedRouteMethods(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const methods = new Set();

  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement)) {
      if (statement.name && HTTP_METHODS.has(statement.name.text))
        methods.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          HTTP_METHODS.has(declaration.name.text)
        ) {
          methods.add(declaration.name.text);
        }
      }
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (HTTP_METHODS.has(element.name.text)) methods.add(element.name.text);
      }
    }
  }

  return [...methods].sort();
}

function propertyName(property) {
  if (!property.name) return null;
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
    return property.name.text;
  return null;
}

function objectProperties(object) {
  const properties = new Map();
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propertyName(property);
    if (name) properties.set(name, property.initializer);
  }
  return properties;
}

function stringValue(node) {
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;
}

export function parseRegistry(sourceText) {
  const source = ts.createSourceFile(
    REGISTRY,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let registryArray = null;
  let methodContractFields = [];

  for (const statement of source.statements) {
    if (
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === "AdminApiMethodContract"
    ) {
      methodContractFields = statement.members
        .filter(ts.isPropertySignature)
        .filter((member) => !member.questionToken)
        .map(propertyName)
        .filter(Boolean);
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "ADMIN_API_ROUTE_REGISTRY" &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(declaration.initializer)
      ) {
        registryArray = declaration.initializer;
      }
    }
  }

  if (!registryArray)
    throw new Error("Registry missing ADMIN_API_ROUTE_REGISTRY array");
  const contracts = [];
  for (const element of registryArray.elements) {
    if (!ts.isObjectLiteralExpression(element))
      throw new Error("Registry entries must be object literals");
    const properties = objectProperties(element);
    const route = stringValue(properties.get("route"));
    const authClass = stringValue(properties.get("authClass"));
    const owner = stringValue(properties.get("owner"));
    const methodsNode = properties.get("methods");
    const methods = ts.isArrayLiteralExpression(methodsNode)
      ? methodsNode.elements.map(stringValue).filter(Boolean)
      : [];
    contracts.push({ route, methods, authClass, owner, properties });
  }

  return { contracts, methodContractFields };
}

function compareSets(expected, actual) {
  return {
    missing: [...expected].filter((value) => !actual.has(value)).sort(),
    stale: [...actual].filter((value) => !expected.has(value)).sort(),
  };
}

export function validateRegistry({
  routeFiles,
  contracts,
  methodContractFields,
  legacyLimit,
}) {
  const errors = [];
  const requiredFields = new Set(METHOD_CONTRACT_FIELDS);
  const declaredFields = new Set(methodContractFields);
  for (const field of requiredFields) {
    if (!declaredFields.has(field))
      errors.push(`AdminApiMethodContract missing required field: ${field}`);
  }

  const routesByPath = new Map(
    routeFiles.map((file) => [toApiPath(file), exportedRouteMethods(file)]),
  );
  const contractsByPath = new Map();
  for (const contract of contracts) {
    if (!contract.route) {
      errors.push("Registry entry has no literal route");
      continue;
    }
    if (contractsByPath.has(contract.route))
      errors.push(`Duplicate registry route: ${contract.route}`);
    contractsByPath.set(contract.route, contract);
    if (!contract.owner?.trim())
      errors.push(`Missing owner: ${contract.route}`);
    if (!contract.authClass)
      errors.push(`Missing authClass: ${contract.route}`);
    if (contract.methods.length === 0)
      errors.push(`Missing methods: ${contract.route}`);
    if (new Set(contract.methods).size !== contract.methods.length) {
      errors.push(`Duplicate method declaration: ${contract.route}`);
    }
    for (const method of contract.methods) {
      if (!HTTP_METHODS.has(method))
        errors.push(`Unsupported method ${method}: ${contract.route}`);
    }
    for (const field of ["idempotency", "audit"]) {
      if (!contract.properties.has(field))
        errors.push(`Missing ${field} declaration: ${contract.route}`);
    }
  }

  const routeDiff = compareSets(
    new Set(routesByPath.keys()),
    new Set(contractsByPath.keys()),
  );
  for (const route of routeDiff.missing)
    errors.push(`Unclassified Admin route: ${route}`);
  for (const route of routeDiff.stale)
    errors.push(`Stale Admin route contract: ${route}`);

  for (const [route, actualMethods] of routesByPath) {
    const contract = contractsByPath.get(route);
    if (!contract) continue;
    const methodDiff = compareSets(
      new Set(actualMethods),
      new Set(contract.methods),
    );
    for (const method of methodDiff.missing)
      errors.push(`Missing route-method contract: ${method} ${route}`);
    for (const method of methodDiff.stale)
      errors.push(`Stale route-method contract: ${method} ${route}`);
  }

  const legacyCount = contracts.filter(
    (contract) => contract.authClass === "legacy_pending_migration",
  ).length;
  if (legacyCount > legacyLimit) {
    errors.push(
      `Legacy classification growth: ${legacyCount} exceeds baseline ceiling ${legacyLimit}`,
    );
  }

  return { errors, legacyCount, routeCount: routesByPath.size };
}

export function main() {
  if (!existsSync(REGISTRY)) throw new Error(`Missing registry: ${REGISTRY}`);
  if (!existsSync(BASELINE))
    throw new Error(`Missing legacy baseline: ${BASELINE}`);
  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  if (
    !Number.isInteger(baseline.legacyRouteLimit) ||
    baseline.legacyRouteLimit < 0
  ) {
    throw new Error("legacyRouteLimit must be a non-negative integer");
  }

  const parsed = parseRegistry(readFileSync(REGISTRY, "utf8"));
  const result = validateRegistry({
    routeFiles: walk(ADMIN_API),
    contracts: parsed.contracts,
    methodContractFields: parsed.methodContractFields,
    legacyLimit: baseline.legacyRouteLimit,
  });

  console.log(`Admin API route files on disk: ${result.routeCount}`);
  console.log(
    `Legacy route classifications: ${result.legacyCount}/${baseline.legacyRouteLimit}`,
  );
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    "REL-103 check OK — route-method contracts are exact and legacy debt did not grow",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
