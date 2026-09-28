# Admin Logistics state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `ADMVIEW-LOG-001` — blocked/queued_postlaunch; MAINTENANCE-DEBT
<!-- generated-agent-state:end -->

- Last reviewed SHA: `unverified`
- Last reviewed at: 2026-09-27
- Confidence: bootstrap only

## Durable facts

- Reports to `admin`; `admin` is the decision owner for child tasks.
- Mission: Own the Admin-facing integration for travel, transportation, lodging, equipment, rentals, catering, logistics boards, site maps, and operational tasking.
- Ownership is limited to the Admin-facing integration layer described by `WORKING_SET.json` and the central segment map.
- Canonical domain services, schema, RLS, shared design-system primitives, QA certification, and release operations remain with their existing top-level owners.

## Current focus

- Await a bounded, dependency-ready task dispatched by `admin`.

## Site-map activity route: the read/write capability split (ADMIN-021, 2026-09-28)

- `app/api/admin/logistics/site-maps/[id]/activity/route.ts` gates **GET on `logistics.view`** and **POST on `logistics.manage`**, matching every other site-map sub-resource. It previously had the pair inverted (GET `logistics.manage`, POST `logistics.view`).
- The impact of the inversion was bounded, and the bound is worth remembering so the fix is not oversold later: the inverted POST gate was the **outer** check only. The inner `requireSiteMapAccess(access, command.action === "VIEW" ? "read" : "edit")` is what actually bounded the write, because a `logistics.view`-only admin resolves to site-map role `viewer` and `canEdit` is false. So it was a defense-in-depth inversion, not an open write path. It became an open write in exactly one case — a caller who is site-map **owner** (role `owner` has `canEdit`) while holding only `logistics.view`.
- `lib/admin/route-registry/logistics.ts` no longer carries `capabilityByMethod` for that route. `adminCommandCapabilities` derives GET `logistics.view` and POST `logistics.manage` from the route-level `capability` via `WRITE_CAPABILITY_BY_BASE`. Recording the inverted pair in `capabilityByMethod` is what made the inversion *provable but invisible*: the registry agreed with the code, so no proof failed.
- **A source-level `toMatch`/`toContain` over a whole route file does not bind a capability to a method.** `source.slice(source.indexOf("export async function GET"))` runs to end-of-file and therefore also covers the POST handler. Two live proofs of this in the repo: the inverted pin's GET expectation stayed green while the route was inverted, and `__tests__/admin/site-map-route-capability-migration.test.ts:52-56` asserts the activity route matches `withAdminCapability("logistics.manage")` across the whole file, which was true before and after the fix and so never discriminated the inversion. When a capability guard matters, bound the slice to the next handler marker, or assert behaviourally.
- `hasAdminCapability` is a flat `capabilities.includes(required)` with **no manage-implies-view rule** (`lib/auth/admin-capabilities.ts:183`). Role bundles such as `PRODUCTION_CAPABILITIES` grant `logistics.view` and `logistics.manage` together, so a test that grants only `logistics.manage` and expects a `logistics.view`-gated read to succeed would be wrong.
- The behavioural pattern used here, worth reusing: double `withAdminCapability` with the **real** `hasAdminCapability` plus the production denial body, and let the real, unmocked `lib/site-map/access` resolve the caller's role from the same capability set (`can_logistics` rpc). Both the outer gate and the inner boundary then run for real, and a cross-organization link yields 404 "Site map not found" for free.

## Pinning a capability to a method, and proving the pin bites (ADMIN-026, 2026-09-28)

- `__tests__/admin/site-map-route-capability-migration.test.ts` now asserts the activity route's read/write split from **per-handler slices**. The bound that matters is `handlerSlice`, which ends a slice at the **next `^export ` declaration**, not at end-of-file. POST is the last declaration in that route, so POST legitimately runs to EOF and GET never does.
- The failure mode is worth stating precisely, because the loose version of the claim is wrong. A whole-file `logistics.view` match is **not** wholly blind: if the `logistics.view` literal is deleted outright the old assertion does go red. The non-discriminating case is narrower and sharper — **both literals present in the file, assigned to the wrong handlers**. That is exactly the pre-ADMIN-021 arrangement (GET `logistics.manage`, POST `logistics.view`), and the pristine file was measured **27/27 green** against it. "Both literals somewhere in the file" was always the claim; "any change to the file" was not.
- **Prove a test-quality fix by running the old file against the same defect, not by describing the new one.** The measurement that settled this task was two vitest runs over the *same* mirrored route tree differing only in which copy of the test file was installed: pristine 27/27 green, edited 2 failed with `GET: expected withAdminCapability("logistics.view") inside the GET handler` first. A control that only shows the new file red proves the new file is red, not that the fix is what made it red.
- **How to observe a real suite go red without mutating a shared product file** (usable in any lane, no repo artifact): build a throwaway vitest root in `os.tmpdir()`, copy the route subtree in, `symlinkSync` the repo's `node_modules` into it, write a `vitest.config.ts` whose `resolve.alias["@"]` points back at the real repo, and run the repo's `node_modules/.bin/vitest` with **cwd set to the throwaway root**. Two traps: vitest does **not** chdir to `--root`, so these tests' `process.cwd()` reads resolve against the shell's workdir and the run fails with `ENOENT` on every route if the workdir is wrong; and an un-inverted mirror run must be green first, or a harness that reads nothing at all looks like a harness that bites. Symlink `node_modules` or the config's `import "vitest/config"` will not resolve.
- **Have the pin return method-tagged failure strings and assert the array is empty** (`activityCapabilityFailures`). A `toEqual([])` whose received value reads `GET: expected ... inside the GET handler` names the failing method in the failure output, where a bare `toMatch` on a concatenated source does not. It also lets the same function be exercised by a negative control, which is what makes the control evidence about the real assertion rather than a reimplementation of it.
- **Residual, reported not fixed.** The same EOF-slice weakness still exists on the **DOMAIN-039 pin in `__tests__/admin/admin-route-capability-matrix.test.ts`** (`const getGate = source.slice(source.indexOf("export async function GET"))` — its `postGate` is correctly bounded only because POST is last). That file is under another lane's lease and was not touched. The nine resource-routes rows and the eight taskLayerMeasurementIssueRoutes rows in this segment's own migration test have the same whole-file shape; AC-2 of ADMIN-026 forbade touching them and they were left byte-identical. When a whole-file gate assertion is all a table row has, the row cannot tell the two arrangements apart — that is the generalisable rule.
- `tsconfig.json` excludes `**/__tests__/**` and `**/*.test.ts`, so **`npm run typecheck` never typechecks a test file**. A test-only change needs its own scoped slice; other lanes write `tsconfig.<task>-slice.json` into the repo root, which is avoidable — a config in `os.tmpdir()` whose `extends` is the absolute path to the repo `tsconfig.json` (with absolute `include` paths) works and leaves no artifact.

## Known risks

- Prefixes in the default working set guide discovery; a task lease must still name exact files.
- Cross-segment changes can collide unless the parent Admin agent records shared ownership and handoffs.
- The DOMAIN-039 shared lease on `__tests__/admin/admin-route-capability-matrix.test.ts` is **spent and still listed** in `SEGMENT_OWNERSHIP.yaml` `shared:`. It must be removed by `admin-governance` (tracked as `HF-ADMIN-021-DOMAIN039-LEASE-REVERT` against `ADMIN-025`). Until then `admin-logistics` appears to own a 407-line cross-segment file, and it must not edit it again.

