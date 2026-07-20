# Logistics Test Plan

## Unit (Vitest `__tests__/logistics/`)

| Area | Coverage |
|------|----------|
| `status.ts` | Domain → UI status maps |
| `time.ts` | Overnight / TZ buffer helpers |
| `money.ts` | Totals/variance major-unit |
| `conflicts.ts` | Capacity, overlap, transfer buffer |
| `dietary-privacy.ts` | Aggregate without PII leak |
| Site-map version link | `map_version_id` + anchor validation |
| Existing canvas/route contracts | Keep green |

## Integration / contract

| Area | Coverage |
|------|----------|
| Org scope on items/metrics/communications/transport | Source contracts + scope helpers |
| Travel/lodging create with Zod body | No prompt-only paths |
| Catering headcount snapshot freeze | Snapshot immutable after publish |
| Backline substitution approval trail | Decision retained |
| Site-map publish → `map_versions` row | Published snapshot |
| Collaborators GET requires access | Auth contract |
| Calendar aggregate includes travel windows | Source present |

## E2E (manual / Playwright when available)

1. Transport publish + passenger ack  
2. Traveler matrix gaps + private hotel details  
3. Equipment reservation conflict  
4. Backline substitute approval  
5. Catering dietary gap without PII leak  
6. Comms critical update ack audience  
7. Site-map publish + task + revoke  
8. Confirmed time change impact  
9. Cross-org denial  
10. Double-submit idempotency  

## Commands

```bash
npm run test:unit -- __tests__/logistics
npm run typecheck
npm run lint
```

Smoke: `docs/implementation/logistics-tab-smoke-checklist.md`
