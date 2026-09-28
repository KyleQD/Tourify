import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCssDeclarations,
  parseRegistry,
  validateTokenRegistry,
} from "./check-token-registry.mjs";

const registry = `
<!-- token-registry-ci
runtime-source: app/globals.css
projection-source: tailwind.config.ts
-->

## Table A — roles

| role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| primary | \`--primary\` | value | primary | app/globals.css | live | |
| radius | \`--radius\` | value | rounded-lg | app/globals.css | live | |

## Table K — projections

| tailwind alias | projection | targets var | var's truth (Table) | status |
| --- | --- | --- | --- | --- |
| \`primary\` | value | \`--primary\` | A live | live |
| \`rounded-lg\` | value | \`--radius\` | A live | live |
`;

const tailwindConfig = {
  theme: {
    extend: {
      colors: { primary: "hsl(var(--primary))" },
      borderRadius: { lg: "var(--radius)" },
    },
  },
};

function validate(overrides = {}) {
  return validateTokenRegistry({
    registryText: registry,
    runtimeSourceContents: new Map([
      ["app/globals.css", ":root {\n  --primary: 1 2 3;\n  --radius: 0.5rem;\n}"],
    ]),
    discoveredGlobalTokenSources: new Set(["app/globals.css"]),
    tailwindConfig,
    ...overrides,
  });
}

test("accepts an exact registry/runtime/Tailwind contract", () => {
  const result = validate();
  assert.deepEqual(result.errors, []);
  assert.equal(result.activeVarCount, 2);
  assert.equal(result.projectionCount, 2);
});

test("rejects a live role without a runtime definition", () => {
  const result = validate({
    runtimeSourceContents: new Map([
      ["app/globals.css", ":root {\n  --primary: 1 2 3;\n}"],
    ]),
  });
  assert(result.errors.includes("Active registry var has no runtime definition: --radius"));
});

test("rejects unregistered declarations and global token sources", () => {
  const result = validate({
    runtimeSourceContents: new Map([
      [
        "app/globals.css",
        ":root {\n  --primary: 1 2 3;\n  --radius: 0.5rem;\n  --rogue: hotpink;\n}",
      ],
    ]),
    discoveredGlobalTokenSources: new Set([
      "app/globals.css",
      "styles/rogue.css",
    ]),
  });
  assert(result.errors.includes("Unregistered token declaration --rogue in app/globals.css"));
  assert(result.errors.includes("Unregistered global token source: styles/rogue.css"));
});

test("rejects Tailwind projection drift", () => {
  const result = validate({
    tailwindConfig: {
      theme: {
        extend: {
          colors: {
            primary: "hsl(var(--primary))",
            brand: "hsl(var(--brand))",
          },
          borderRadius: { lg: "var(--radius)" },
        },
      },
    },
  });
  assert(
    result.errors.includes(
      "Tailwind projection brand targets unregistered or inactive --brand",
    ),
  );
  assert(result.errors.includes("Tailwind projection missing from Table K: brand"));
});

test("parses minified declarations and ignores commented declarations", () => {
  assert.deepEqual(
    parseCssDeclarations(
      ":root{--primary:1 2 3;--radius:0.5rem}/* :root{--commented:red;} */",
    ),
    [
      { variable: "--primary", value: "1 2 3" },
      { variable: "--radius", value: "0.5rem" },
    ],
  );
});

test("rejects invalid registry and projection statuses", () => {
  const invalid = registry
    .replace("| live | |", "| removed | |")
    .replace("| A live | live |", "| A live | dead |");
  const result = validate({ registryText: invalid });
  assert(
    result.errors.some((error) =>
      error.startsWith("Table A role has invalid status removed:"),
    ),
  );
  assert(
    result.errors.includes("Table K projection primary has invalid status dead"),
  );
});

test("rejects malformed rows instead of silently dropping them", () => {
  const malformed = registry.replace(
    "| radius | `--radius` | value | rounded-lg | app/globals.css | live | |",
    "| radius | `--radius` | value | rounded-lg | app/globals.css | live |",
  );
  const result = validate({ registryText: malformed });
  assert(
    result.errors.some((error) =>
      error.startsWith("Table A role row must have 7 cells:"),
    ),
  );
});

test("rejects source paths outside the repository", () => {
  const parsed = parseRegistry(
    registry.replace(
      "runtime-source: app/globals.css",
      "runtime-source: ../outside.css",
    ),
  );
  assert(
    parsed.errors.includes(
      "token-registry-ci source must stay inside the repository: ../outside.css",
    ),
  );
});

test("rejects flattened Tailwind alias collisions", () => {
  const result = validate({
    tailwindConfig: {
      theme: {
        extend: {
          colors: {
            brand: { accent: "hsl(var(--primary))" },
            "brand-accent": "hsl(var(--primary))",
          },
        },
      },
    },
  });
  assert(result.errors.includes("Duplicate Tailwind projection alias: brand-accent"));
});
