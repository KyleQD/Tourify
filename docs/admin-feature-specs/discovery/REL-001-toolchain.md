# REL-001 — Runtime / toolchain pin

**Status:** Complete  
**Revalidated:** 2026-07-21

## Decision

- **Node:** `20.x` (engines in `package.json`; `.nvmrc` → `20`)
- **Package manager:** npm, declared as `npm@11.5.2`; npm 10–11 may bootstrap the install, while the declared version is the release tooling target
- **Lockfile:** committed npm lockfile v3
- **Local enforcement:** `.nvmrc`, `engines`, `.npmrc` (`engine-strict`, no legacy peers), and `npm run check:toolchain`
- CI and local must use Node 20; Node 24 is unsupported for required checks

## Verify

`check-toolchain.mjs` fails wrong Node major, non-npm execution, `legacy-peer-deps`, missing/wrong lockfile, package-manager drift, and engine drift. Main CI runs it after the reproducible `npm ci` install.

The local verification host reports Node v20.19.0 and npm 11.5.2. A clean no-legacy install is verified separately in REL-002 because peer compatibility is its explicit acceptance criterion.
