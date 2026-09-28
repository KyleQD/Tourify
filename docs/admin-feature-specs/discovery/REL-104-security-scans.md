# REL-104 — Secret / dependency / static scans

**Status:** Blocked on hosted repository settings and run evidence  
**Date:** 2026-07-21

## Delivered

1. Existing CI step: `npm audit --audit-level=critical` in `.github/workflows/ci.yml`.
2. Dedicated `.github/workflows/security-scans.yml` runs full-history Gitleaks, CodeQL JavaScript/TypeScript `security-extended`, critical-severity PR dependency review, and CycloneDX JSON SBOM generation with artifact retention.
3. `security/security-scan-exceptions.json` is validated by `scripts/ci/check-security-exceptions.mjs`. Every exception requires finding identity, owner, rationale, issue, future expiry, mitigation, and reviewed production exploitability. Unknown exploitability cannot waive a finding.
4. The exception registry is empty; no current finding is suppressed by repository configuration.

## Hosted evidence required

- Run every job successfully and retain the scan/SBOM artifacts.
- Enable the GitHub Dependency Graph and code scanning/GHAS where required.
- Enable native secret scanning and push protection and confirm Gitleaks licensing for the repository owner.
- Add the security jobs to required branch-protection checks.
- Verify fork-PR permissions permit CodeQL upload without granting unsafe write access.

Repository workflow declarations alone do not prove these hosted controls are active, so REL-104 remains blocked rather than overstating completion.
