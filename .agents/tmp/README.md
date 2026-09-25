# Wave 34 — design-system lane: orphaned `lib/services/**` sweep (DESIGN-034 / DESIGN-037)

Scratch tooling for the sweep. These are the **measurement instruments**, kept so the
evidence in `docs/engineering/agents/design-system/lib-services-inventory-2026-09-25.json`
is reproducible rather than asserted. Nothing here is imported by the application.

| File | What it is |
| --- | --- |
| `lib-services-inventory.mjs` | Builds the importer/liveness graph: resolves every `import`/`export … from`, dynamic `import()`, `require()` and bare side-effect import across all source files with extensionless, `/index`, alias and relative resolution, then BFSes from every Next.js entry point to decide live vs dead. Writes the graph JSON. |
| `crosscheck-specifiers.mjs` | The **independent second pass**. Extracts every quoted import specifier in the repository with `rg -o` — a different extraction path from the graph walk — and resolves only root-anchored spellings, so a zero-importer claim is never verified by the same method that produced it. |
| `ref-sweep.mjs` | Exhaustive `rg -F` sweep over **every** file in the repository including docs, JSON manifests, SQL, `.txt` checklists and logs, for both a module filename and its bare stem. Catches string-path dynamic imports, `vi.mock`, `moduleNameMapper` and manifest references that no import graph sees. |
| `scope-typecheck.mjs` | Scoped tsc. A full `npm run typecheck` is prohibited in a multi-lane wave (CI 68m18s, 1,384 primary diagnostics, OOMs on 8GB with six lanes), so this generates a per-run `tsconfig.ds-scope.json` whose `include` is exactly the named roots, inherits the repository's own `compilerOptions`, and records `tsFilesParsed` so a short-circuiting invocation cannot masquerade as a clean one. Writes `scope-results/<label>.json` and deletes the temp tsconfig. |
| `resolve-objects.mjs` | Cross-references the database lane's per-object verdicts against the post-sweep tree to produce the resolved-vs-open object split. |
| `build-inventory-artifact.mjs` | Assembles the durable inventory artifact from the graph, the scoped-tsc measurements and the database lane's verdicts. |
| `lib-services-inventory-{pre,post}.json` | The importer graph before and after the sweep. The pre-sweep copy is what proves a deleted module had zero importers at deletion time. |
| `scope-results/` | Raw tsc output and the counted per-file diagnostic report for every scoped run, including the negative and positive controls. |

## Running them

```bash
# importer + liveness graph
node .agents/tmp/lib-services-inventory.mjs > .agents/tmp/lib-services-inventory-post.json

# scoped typecheck of a set of roots (label, then file paths)
node .agents/tmp/scope-typecheck.mjs pre-del-A lib/services/advanced-analytics.service.ts ...

# rebuild the durable artifact
node .agents/tmp/build-inventory-artifact.mjs
```

## What each measurement proved

- `scope-typecheck.mjs` returned 0 diagnostics in 3.2s on one run and 121s with 42
  diagnostics on a re-run of the same inputs. `tsFilesParsed` is recorded on every run
  precisely so the 3.2s result is recognisable as a short circuit rather than a clean
  file. **A fast tsc is a suspect tsc.**
- The scoped run over `venue.service.ts` / `artist.service.ts` / `account-management.service.ts`
  measured 29 primary diagnostics before the deletions and 29 after, with an identical
  `byCode` distribution — which is what proved no diagnostic migrated into surviving code.
- `crosscheck-specifiers.mjs` and `ref-sweep.mjs` both cleared all 22 originally claimed
  zero-importer modules, which is what made the deletions safe.
- The two modules held rather than deleted (`organization-social-integrations.service.ts`,
  `social-interactions.service.ts`) were found **only** by `ref-sweep.mjs`, because the
  references are `readFileSync` assertions in another lane's test files, not imports.
