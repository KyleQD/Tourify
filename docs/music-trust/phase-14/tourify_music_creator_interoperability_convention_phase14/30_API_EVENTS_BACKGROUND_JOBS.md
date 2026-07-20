# API, events, background jobs (derived)

## Routes

| Method | Path | Flag gate |
|---|---|---|
| GET | `/api/creator-interoperability-convention/networks` | readiness \| network_registry |
| GET/POST | `/api/creator-interoperability-convention/approval-packages` | approval_package |
| GET/POST | `/api/creator-interoperability-convention/recognition` | mutual_recognition |
| GET/POST | `/api/creator-interoperability-convention/gated` | always reports hard gates |
| GET | `/api/creator-interoperability-convention/status` | public_status \| readiness |
| GET/POST | `/api/admin/creator-interoperability-convention/ops` | readiness + admin |

## Worker

`npm run music:creator-interoperability-convention-outbox-worker` → `creator_interop_outbox`

## Note on Phase 13 handoff copy-paste

Handoff doc `34_…` incorrectly lists Phase 13 API/flag paths for Phase 14 engineering. ADR: use Phase 14 namespaces only.
