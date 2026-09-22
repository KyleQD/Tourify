#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postcss from "postcss";

const ROOT = process.cwd();
const REGISTRY = path.join(
  ROOT,
  "docs/implementation/ui-ux-completion/TOKEN_REGISTRY.md",
);
const ACTIVE_STATUSES = new Set(["live", "conflict"]);
const ROLE_STATUSES = new Set(["live", "dead", "conflict", "duplicate"]);
const PROJECTION_STATUSES = new Set(["live", "conflict"]);

function cleanCell(value) {
  return value.replace(/[*~]/g, "").trim();
}

function tableCells(line) {
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function exactCodeValue(cell) {
  const match = cell.trim().match(/^`([^`]+)`$/);
  return match?.[1] ?? null;
}

export function parseRegistry(registryText) {
  const errors = [];
  const roles = [];
  const projections = new Map();
  let table = null;
  let roleRows = false;
  let projectionRows = false;

  for (const line of registryText.split(/\r?\n/)) {
    const heading = line.match(/^## Table ([A-L])\b/);
    if (heading) {
      table = heading[1];
      roleRows = false;
      projectionRows = false;
      continue;
    }
    if (!line.startsWith("|")) {
      roleRows = false;
      projectionRows = false;
      continue;
    }
    if (line.startsWith("| ---")) continue;

    const cells = tableCells(line);
    if (table && table >= "A" && table <= "I") {
      if (cleanCell(cells[0] ?? "") === "role") {
        roleRows = cleanCell(cells[1] ?? "").startsWith("canonical var");
        continue;
      }
      if (!roleRows) continue;
      if (cells.length !== 7) {
        errors.push(`Table ${table} role row must have 7 cells: ${line}`);
        continue;
      }
      const variable = exactCodeValue(cells[1] ?? "");
      if (!variable?.startsWith("--")) {
        errors.push(`Table ${table} role has no exact canonical var: ${line}`);
        continue;
      }
      const status = cleanCell(cells[5] ?? "").split(/\s+/)[0];
      if (!ROLE_STATUSES.has(status)) {
        errors.push(`Table ${table} role has invalid status ${status}: ${line}`);
      }
      roles.push({ table, role: cleanCell(cells[0]), variable, status });
    }

    if (table === "K") {
      if (cleanCell(cells[0] ?? "") === "tailwind alias") {
        projectionRows = true;
        continue;
      }
      if (!projectionRows) continue;
      if (cells.length < 5 || cells.length > 6) {
        errors.push(`Table K projection row must have 5 or 6 cells: ${line}`);
        continue;
      }
      const alias = exactCodeValue(cells[0] ?? "");
      const variable = exactCodeValue(cells[2] ?? "");
      if (!alias || !variable?.startsWith("--")) {
        errors.push(`Table K projection must use exact alias and var cells: ${line}`);
        continue;
      }
      if (projections.has(alias)) {
        errors.push(`Duplicate Table K projection alias: ${alias}`);
        continue;
      }
      const status = cleanCell(cells[4] ?? "").split(/\s+/)[0];
      if (!PROJECTION_STATUSES.has(status)) {
        errors.push(`Table K projection ${alias} has invalid status ${status}`);
      }
      projections.set(alias, variable);
    }
  }

  const contractMatch = registryText.match(
    /<!-- token-registry-ci\s*([\s\S]*?)-->/,
  );
  const runtimeSources = [];
  const projectionSources = [];
  if (!contractMatch) {
    errors.push("Missing token-registry-ci source contract");
  } else {
    for (const line of contractMatch[1].split(/\r?\n/)) {
      const entry = line.trim().match(/^(runtime-source|projection-source):\s*(\S+)$/);
      if (!entry) continue;
      const source = entry[2];
      const normalized = path.posix.normalize(source.replace(/\\/g, "/"));
      if (
        path.posix.isAbsolute(normalized) ||
        normalized === ".." ||
        normalized.startsWith("../")
      ) {
        errors.push(`token-registry-ci source must stay inside the repository: ${source}`);
        continue;
      }
      if (entry[1] === "runtime-source") runtimeSources.push(normalized);
      else projectionSources.push(normalized);
    }
  }
  if (runtimeSources.length === 0)
    errors.push("token-registry-ci contract has no runtime-source");
  if (projectionSources.length !== 1)
    errors.push("token-registry-ci contract must have exactly one projection-source");

  return { errors, roles, projections, runtimeSources, projectionSources };
}

export function parseCssDeclarations(source) {
  const declarations = [];
  postcss.parse(source).walkDecls(/^--/, (declaration) => {
    declarations.push({
      variable: declaration.prop,
      value: declaration.value.trim(),
    });
  });
  return declarations;
}

function projectionAlias(pathParts, kind) {
  const parts = pathParts.filter((part) => part !== "DEFAULT");
  const name = parts.join("-");
  return kind === "borderRadius" ? `rounded-${name}` : name;
}

function collectProjectionObject(value, kind, pathParts, projections, errors) {
  if (typeof value === "string") {
    const variables = [...value.matchAll(/var\((--[a-zA-Z0-9_-]+)/g)].map(
      (match) => match[1],
    );
    if (variables.length === 0) return;
    const unique = [...new Set(variables)];
    const alias = projectionAlias(pathParts, kind);
    if (unique.length !== 1) {
      errors.push(
        `Tailwind projection ${alias} must target exactly one CSS var; found ${unique.join(", ")}`,
      );
      return;
    }
    if (projections.has(alias)) {
      errors.push(`Duplicate Tailwind projection alias: ${alias}`);
      return;
    }
    projections.set(alias, unique[0]);
    return;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, child] of Object.entries(value)) {
    collectProjectionObject(child, kind, [...pathParts, key], projections, errors);
  }
}

export function collectTailwindProjections(config) {
  const projections = new Map();
  const errors = [];
  const extend = config?.theme?.extend ?? {};
  collectProjectionObject(extend.colors, "colors", [], projections, errors);
  collectProjectionObject(
    extend.borderRadius,
    "borderRadius",
    [],
    projections,
    errors,
  );
  return { errors, projections };
}

export function validateTokenRegistry({
  registryText,
  runtimeSourceContents,
  discoveredGlobalTokenSources,
  tailwindConfig,
}) {
  const parsed = parseRegistry(registryText);
  const errors = [...parsed.errors];
  const registeredVars = new Set(parsed.roles.map((role) => role.variable));
  const activeVars = new Set(
    parsed.roles
      .filter((role) => ACTIVE_STATUSES.has(role.status))
      .map((role) => role.variable),
  );
  const allowedSources = new Set(parsed.runtimeSources);
  const definitions = new Map();

  for (const source of discoveredGlobalTokenSources) {
    if (!allowedSources.has(source)) {
      errors.push(`Unregistered global token source: ${source}`);
    }
  }

  for (const source of allowedSources) {
    const contents = runtimeSourceContents.get(source);
    if (contents == null) {
      errors.push(`Registered runtime source is missing: ${source}`);
      continue;
    }
    for (const declaration of parseCssDeclarations(contents)) {
      if (!registeredVars.has(declaration.variable)) {
        errors.push(
          `Unregistered token declaration ${declaration.variable} in ${source}`,
        );
      }
      const entries = definitions.get(declaration.variable) ?? [];
      entries.push({ source, value: declaration.value });
      definitions.set(declaration.variable, entries);
    }
  }

  for (const variable of activeVars) {
    if (!definitions.has(variable)) {
      errors.push(`Active registry var has no runtime definition: ${variable}`);
    }
  }

  for (const variable of activeVars) {
    for (const definition of definitions.get(variable) ?? []) {
      for (const match of definition.value.matchAll(
        /var\((--[a-zA-Z0-9_-]+)/g,
      )) {
        if (!definitions.has(match[1])) {
          errors.push(
            `Runtime value for ${variable} in ${definition.source} references undefined ${match[1]}`,
          );
        }
      }
    }
  }

  const actual = collectTailwindProjections(tailwindConfig);
  errors.push(...actual.errors);
  for (const [alias, variable] of actual.projections) {
    if (!activeVars.has(variable)) {
      errors.push(
        `Tailwind projection ${alias} targets unregistered or inactive ${variable}`,
      );
    }
    if (!parsed.projections.has(alias)) {
      errors.push(`Tailwind projection missing from Table K: ${alias}`);
    } else if (parsed.projections.get(alias) !== variable) {
      errors.push(
        `Table K target mismatch for ${alias}: expected ${variable}, recorded ${parsed.projections.get(alias)}`,
      );
    }
  }
  for (const alias of parsed.projections.keys()) {
    if (!actual.projections.has(alias)) {
      errors.push(`Stale Table K projection: ${alias}`);
    }
  }

  return {
    errors,
    roleCount: parsed.roles.length,
    activeVarCount: activeVars.size,
    projectionCount: actual.projections.size,
    runtimeSourceCount: allowedSources.size,
  };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if ([".git", ".next", "node_modules"].includes(name)) continue;
    const full = path.join(dir, name);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export async function main() {
  if (!existsSync(REGISTRY)) throw new Error(`Missing registry: ${REGISTRY}`);
  const registryText = readFileSync(REGISTRY, "utf8");
  const parsed = parseRegistry(registryText);
  const runtimeSourceContents = new Map();
  for (const source of parsed.runtimeSources) {
    const absolute = path.join(ROOT, source);
    if (existsSync(absolute)) {
      runtimeSourceContents.set(source, readFileSync(absolute, "utf8"));
    }
  }

  const discoveredGlobalTokenSources = new Set();
  for (const file of walk(ROOT)) {
    if (!file.endsWith(".css") || file.endsWith(".module.css")) continue;
    const contents = readFileSync(file, "utf8");
    if (parseCssDeclarations(contents).length > 0) {
      discoveredGlobalTokenSources.add(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
  }

  const projectionSource = parsed.projectionSources[0];
  let tailwindConfig = {};
  if (projectionSource) {
    const absolute = path.join(ROOT, projectionSource);
    if (!existsSync(absolute)) {
      parsed.errors.push(`Registered projection source is missing: ${projectionSource}`);
    } else {
      tailwindConfig = (await import(pathToFileURL(absolute).href)).default;
    }
  }

  const result = validateTokenRegistry({
    registryText,
    runtimeSourceContents,
    discoveredGlobalTokenSources,
    tailwindConfig,
  });
  result.errors.unshift(...parsed.errors.filter((error) => !result.errors.includes(error)));

  console.log(`Registry role rows: ${result.roleCount}`);
  console.log(`Active runtime vars: ${result.activeVarCount}`);
  console.log(`Tailwind var projections: ${result.projectionCount}`);
  console.log(`Registered global token sources: ${result.runtimeSourceCount}`);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    "DESIGN-034 check OK — runtime roles, Tailwind projections, and token sources match the registry",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
