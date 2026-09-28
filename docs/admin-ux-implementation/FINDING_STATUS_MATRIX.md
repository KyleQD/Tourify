# Finding Status Matrix

> Historical working note only. Do not use the labels below to promote audit status. Canonical status is derived from `docs/admin-audit/registry/`; UX traceability is recorded in `docs/admin-audit/registry/ux-audit-program.json`.

## Legend
- **OPEN** — Finding still applicable, not addressed
- **PARTIALLY** — Some work done but finding not fully resolved
- **RESOLVED** — Finding addressed by commits since audit
- **SUPERSEDED** — Architecture change makes finding moot
- **DEFERRED** — Explicit product decision to defer

## P1 Findings (54)

| ID | Status | Workstream | Notes |
|---|---|---|---|
| AUX-IA-001 | OPEN | WS1-IA | Sidebar still feature-inventory |
| AUX-IA-003 | OPEN | WS1-IA | Mobile sidebar still custom |
| AUX-IA-010 | OPEN | WS2-URL | URL conventions still inconsistent |
| AUX-CMP-005 | OPEN | WS3-Components | Nested main still present |
| AUX-CMP-008 | OPEN | WS3-Components | Tab walls still present |
| AUX-DASH-002 | OPEN | WS6-Dashboard | Realtime trust still unclear |
| AUX-DASH-004 | OPEN | WS6-Dashboard | Dashboard tabs still local state |
| AUX-DASH-005 | OPEN | WS6-Dashboard | Task state still false-empty |
| AUX-DASH-006 | OPEN | WS6-Dashboard | Mini calendar still fake affordance |
| AUX-DASH-009 | OPEN | WS6-Dashboard | View All still routes to wrong place |
| AUX-EVT-001 | OPEN | WS7-Events | Event pagination still 100 cap |
| AUX-EVT-003 | OPEN | WS7-Events | Needs Attention click broken |
| AUX-EVT-004 | OPEN | WS7-Events | Export error overwrites page |
| AUX-EVT-006 | OPEN | WS7-Events | Event card metric false-zero |
| AUX-EVT-009 | OPEN | WS7-Events | 13 peer tabs |
| AUX-EVT-010 | OPEN | WS7-Events | 76KB monolith page |
| AUX-EVT-012 | OPEN | WS7-Events | Child domain failures hidden |
| AUX-FIN-001 | OPEN | WS13-Finance | False-zero after finance failure |
| AUX-FIN-002 | OPEN | WS13-Finance | Finance tabs not URL-synced |
| AUX-FIN-003 | OPEN | WS13-Finance | Client CSV export incomplete |
| AUX-FIN-004 | OPEN | WS13-Finance | Charts from limited data |
| AUX-TIX-001 | OPEN | WS12-Ticketing | 12 peer tabs |
| AUX-TIX-002 | OPEN | WS12-Ticketing | Ticketing tabs not URL-synced |
| AUX-TIX-003 | OPEN | WS12-Ticketing | Initial fanout too heavy |
| AUX-TIX-004 | OPEN | WS12-Ticketing | Failed data becomes empty |
| AUX-TIX-007 | OPEN | WS12-Ticketing | Client CSV incomplete |
| AUX-LOG-002 | OPEN | WS11-Logistics | Initial data fanout |
| AUX-LOG-003 | OPEN | WS11-Logistics | Logistics false-zero |
| AUX-LOG-005 | OPEN | WS11-Logistics | Canonical workspace duplication |
| AUX-ORG-001 | OPEN | WS10-Org | 16 peer tabs |
| AUX-HIRE-001 | OPEN | WS9-Workforce | Hiring tabs not URL-synced |
| AUX-WRK-001 | OPEN | WS9-Workforce | Staff mobile tabs |
| AUX-ANL-001 | OPEN | WS16-Analytics | Analytics false-zero |
| AUX-ANL-002 | OPEN | WS16-Analytics | Export missing acting context |
| AUX-ANL-005 | OPEN | WS16-Analytics | Live feed scope unfiltered |
| AUX-ANL-006 | OPEN | WS16-Analytics | Charts from limited arrays |
| AUX-CAL-002 | OPEN | WS2-URL | Calendar scope request context |
| AUX-CAL-003 | OPEN | WS2-URL | Calendar option false-empty |
| AUX-COM-001 | OPEN | WS15-Comms | Mobile master-detail missing |
| AUX-COM-003 | OPEN | WS15-Comms | Unread counts not rendered |
| AUX-COM-008 | PARTIALLY | WS15-Comms | Signed URLs exist but audit unverified |
| AUX-STATE-001 | OPEN | WS4-State | Universal false-zero patterns |
| AUX-FLOW-001 | OPEN | WS1-IA | Workspace ownership ambiguous |
| AUX-FLOW-002 | OPEN | WS18-Actions | Action labels misleading |
| AUX-FLOW-003 | OPEN | WS2-URL | Cross-domain URL inconsistency |
| AUX-FLOW-004 | OPEN | WS2-URL | Scope visibility inconsistent |
| AUX-FLOW-006 | OPEN | WS5-Collections | KPI source inconsistent |

## P2 Findings (94) — Summary

All P2 findings remain OPEN. Key clusters:
- Component convergence (AUX-CMP-*): 6 findings
- Event detail (AUX-EVT-011 through 020): 10 findings  
- Tour collection (AUX-TOUR-001 through 012): 12 findings
- Finance detail (AUX-FIN-005 through 008): 4 findings
- Organization governance (AUX-ORG-002 through 006): 5 findings
- Logistics (AUX-LOG-001 through 012): 10 findings
- Communications (AUX-COM-002 through 009): 8 findings
- Analytics (AUX-ANL-003, 004, 007): 3 findings
- State/interaction (AUX-STATE-*): 3 findings
- Flow/workflow (AUX-FLOW-005 through 010): 6 findings
- Accessibility (AUX-A11Y-003 through 008): 6 findings
- Other domain-specific: remaining

## P3 Findings (10) — Summary

All P3 findings remain OPEN. Deferred until shared architecture lands.

## Summary

- **OPEN:** 157
- **PARTIALLY:** 1 (AUX-COM-008)
- **RESOLVED:** 0
- **SUPERSEDED:** 0
- **DEFERRED:** 0
