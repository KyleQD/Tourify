# Music Trust Incident Runbook

## Severity triggers

- Critical: public evidence exposure, signed-URL leakage, cross-owner access, or unauthorized certificate issuance.
- High: publication gate bypass, reviewer authorization bypass, widespread worker dead-lettering, or inaccurate active badges.
- Medium: isolated repair failures or delayed origin processing without data exposure.

## Response

1. Disable the narrow affected feature flag. Existing playback and legacy music must remain available.
2. Preserve logs and append audit events; never log or copy signed URLs, evidence contents, storage paths, reviewer notes, or detector scores into incident chat.
3. For badge integrity incidents, disable public verification and remove the denormalized active badge while preserving certificate history.
4. For worker incidents, stop the worker loop, recover stale locks, verify capability configuration, and resume with a small batch.
5. For access-control incidents, revoke affected credentials, audit evidence access events, and involve security/privacy owners.
6. Document scope, user impact, containment, remediation, and a flag-off/flag-on regression result before re-enabling.

No production flag enablement or remote migration is authorized by this Phase 1 implementation alone.
