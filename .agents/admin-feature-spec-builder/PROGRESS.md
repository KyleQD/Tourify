# Admin Feature Spec Builder — Progress Ledger

**Current pointer:** `COMPLETE`
**Last updated:** 2026-07-24
**Session note:** All phases 0–6 complete. 362 inventory items done (0 blocked, 0 wont-fix). 255 Phase 6 tests passing. No DB reset. No commits.

Statuses: `pending` | `in_progress` | `done` | `wont-fix` | `blocked`

## Phase 0 — Decisions and safety harness

| ID | Status | Notes |
|----|--------|-------|
| `ADR-001` | done | |
| `ADR-002` | done | |
| `ADR-003` | done | |
| `ADR-004` | done | |
| `ADR-005` | done | |
| `ADR-006` | done | |
| `ADR-007` | done | |
| `ADR-008` | done | |
| `ADR-009` | done | |
| `ADR-010` | done | |
| `PLAN-001` | done | |
| `PLAN-002` | done | |
| `PLAN-003` | done | |
| `PUB-001` | done | |
| `PUB-002` | done | |
| `TIX-001` | done | |
| `TIX-002` | done | |
| `FIN-001` | done | |
| `FIN-002` | done | |
| `CONT-101` | done | |
| `SEC-001` | done | |
| `SEC-002` | done | |
| `SEC-003` | done | |
| `SEC-004` | done | |
| `SEC-005` | done | |
| `REL-001` | done | |
| `REL-002` | done | date-fns@4.4 + overrides; npm ls clean |
| `REL-003` | done | `npm run build` exit 0; fixed TS blockers (not ENOTEMPTY) |
| `REL-004` | done | |
| `REL-005` | done | |
| `REL-006` | done | |
| `REL-007` | done | |
| `REL-008` | done | |
| `REP-001` | done | |

## Phase 1 — Tenant and API convergence

| ID | Status | Notes |
|----|--------|-------|
| `REL-101` | done | Ephemeral CI + persona matrix + test:rls-matrix |
| `REL-102` | done | Template + check:migration-validation in CI |
| `REL-103` | done | api-route-registry + check:admin-route-registry |
| `REL-104` | done | npm audit critical in CI + scan policy doc |
| `SEC-101` | done | correlationId + cache key + acting headers |
| `SEC-102` | done | resolveEffectiveAdminCapabilities + tests |
| `SEC-103` | done | executeOrgCommand + withOrgCommand + tours DELETE |
| `SEC-104` | done | 185/185 classified; logistics+tour delete migrated |
| `SEC-105` | done | Tenant keys + quarantine + restrictive null-org deny |
| `SEC-106` | done | can_finance + sec106_* policies; audit append-only |
| `SEC-107` | done | can_logistics + parent/child org-scoped policies |
| `SEC-108` | done | Explicit DROP blankets; legacy ticket tables read-only |
| `SEC-109` | done | executeServiceRoleJob + allowlist CI; refund migrated |
| `SEC-110` | done | orgScoped* helpers + RPC; tours/transport/lodging wired |
| `SEC-111` | done | security_audit_events + fail policy ADR; org-command wired |
| `SEC-112` | done | authorization-contract.test.ts (12 cases) |
| `TOUR-101` | done | evaluateTourTransition + tests; legacy status map |
| `TOUR-102` | done | Canonical tour-access.service + getTour/assertAdminTourAccess delegate |
| `TOUR-103` | done | 16/16 legacy routes inventoried + CI gate |
| `TOUR-104` | done | Portfolio query contract + n=500 tests; GET page meta |
| `TOUR-105` | done | Surface states + portfolio/command-center wiring |
| `TOUR-106` | done | Telemetry events + table + list/summary/legacy/fanout |
| `PLAN-101` | done | Canonical plan R/W + builder uses PUT /plan |
| `PLAN-102` | done | 409 + safe diff; autosave adopts server plan |
| `PLAN-103` | done | exact/merge/attach_only reconcile; events retained on detach |
| `PLAN-104` | done | reconcile-preview API + builder confirm dialog |
| `PLAN-105` | done | setup_intent only; explicit /provision command |
| `PUB-101` | done | Atomic domain+outbox; claim/backoff/DLQ/replay; cron+admin APIs |
| `PUB-102` | done | Snapshot→access-log schema + org RLS + TS contract |
| `PUB-103` | done | In-app first-class; email/SMS/push adapter contract |
| `EVENT-101` | done | Canonical event-access.service; advancing/day-sheet/docs wired |
| `EVENT-102` | done | Typed setup destinations + validation on create/update |
| `EVENT-103` | done | Setup checklist on create; provision changes/failures; no invented ops |
| `EVENT-104` | done | event_version CAS + 409 diff; tour-plan touch bumps |
| `WORK-101` | done | Identity map + duplicate risk report (13 sources, 5 patterns) |
| `WORK-102` | done | can_workforce + org_id; authority + field projections; team-members/shifts wired |
| `WORK-103` | done | Canonical identity + status transitions; sync/hire/tour/calendar wired |
| `WORK-104` | done | Live avail from shifts only; demo templates isolated + labeled |
| `WORK-105` | done | Duplicate scan/preview/merge; weak signals blocked; aliases table |
| `TRAVEL-101` | done | Child org_id + quarantine + verify RPC; travel/lodging/transport writes stamp org |
| `TRAVEL-102` | done | Catalog blankets → can_logistics; children org_id+parent match |
| `TRAVEL-103` | done | |
| `TRAVEL-104` | done | |
| `LOG-101` | done | |
| `LOG-102` | done | |
| `LOG-103` | done | |
| `LOG-104` | done | |
| `MAP-101` | done | |
| `TIX-101` | done | |
| `TIX-102` | done | foundation can_ticketing + grant-row-only; tix102_* policies |
| `TIX-103` | done | canonical commands + inventory + Idempotency-Key |
| `TIX-104` | done | dual-read mismatch dashboard; cutover blocked on delta |
| `TIX-105` | done | explicit setup / not_ticketed; no silent GA/qty |
| `FIN-101` | done | org keys + quarantine + fin101_* restrictive RLS |
| `FIN-102` | done | blankets dropped; protected projection; direct-client cases |
| `FIN-103` | done | Canonical commands + compat routes |
| `FIN-104` | done | Scope search picker; no UUID fields |
| `FIN-105` | done | Reversal/adjustment links + immutability tests |
| `VEND-101` | done | Legacy vendors/team + vendor-requests → tour/event access |
| `VEND-102` | done | ADR + vendors/aliases schema + identity TS contract |
| `VEND-103` | done | vendor.sensitive + projection + vendor_documents |
| `CAL-101` | done | Source health + org_id + hiring JSON dates; degraded UI |
| `CAL-102` | done | Acting org + caps + projection + isolation/feed contract |
| `CAL-103` | done | Calendar POST → logistics/staffing commands; no placeholders |
| `COMMS-101` | done | 42-path inventory + coverage tests |
| `REP-101` | done | ~55 consumers + zero-mock/org-hole tracking |

## Phase 2 — Authoritative planning and publication

| ID | Status | Notes |
|----|--------|-------|
| `SEC-201` | done | Legacy tours routes → assertAdminTourAccess; collaborator tests |
| `SEC-202` | done | state-aware auth + SoD on tour/event/finance mutations |
| `SEC-203` | done | protected-data policy + traveler projection + logistics.sensitive |
| `SEC-204` | done | entity_grants + delegated access API + enumeration ban |
| `SEC-205` | done | capability-aware nav + CapGate + effective-capabilities API |
| `TOUR-201` | done | metadata_version + expected_version conflict diff on tour PATCH |
| `TOUR-202` | done | transition commands API + outbox/audit; ban direct status PATCH |
| `TOUR-203` | done | summary BFF + p95=800ms; command-center uses 1-call load |
| `TOUR-204` | done | Tab contracts + active-tab mounts; no overview editor/dupe fanout |
| `TOUR-205` | done | duplicate-preview API + selectable dialog (copies/links/exclusions/conflicts) |
| `TOUR-206` | done | tour_duplicate_jobs + execute/resume APIs; per-domain status + id_map audit |
| `TOUR-207` | done | archive-preview + revoke shares on archive; restore to pre_archive_state |
| `TOUR-208` | done | delete-preview + eligibility blockers; audited hard delete detaches events |
| `TOUR-209` | done | tags/owners/saved views + visibility-safe counts |
| `TOUR-210` | done | bulk-preview + bulk execute; partialFailure item results |
| `PLAN-201` | done | tour_versions/stops + deterministic backfill/quarantine |
| `PLAN-202` | done | stop editor fields + schema (types/TZ/windows/contacts) |
| `PLAN-203` | done | keyboard/pointer reorder + contiguous ordinals |
| `PLAN-204` | done | stop impact preview + blockers/next actions |
| `PLAN-205` | done | tour_stop_holds lifecycle + API |
| `PLAN-206` | done | persisted-plan readiness engine + API |
| `PLAN-207` | done | categorized change sets / affected domains |
| `PLAN-208` | done | selectable planner deep-copy + date/TZ validation |
| `PUB-201` | done | publish uses persisted readiness + warning overrides |
| `PUB-202` | done | deterministic snapshot renderer + checksum |
| `PUB-203` | done | audience preview (counts/roles/exclusions/channels) |
| `PUB-204` | done | atomic snapshot+audience+deliveries+lifecycle+outbox; idempotent replay |
| `PUB-205` | done | delivery dashboard + safe retry + evidence export |
| `PUB-206` | done | hashed tokens, scope/expiry/passcode/max-use/revoke + access logs |
| `PUB-207` | done | retract/supersede + access invalidate + history notices |
| `PUB-208` | done | tour/event/day-sheet/advance/map use scoped shares; no Admin URL copy |
| `EVENT-201` | done | contract IDs + engine + publish gate + readiness API |
| `EVENT-202` | done | owners + direct actions; blocked/unknown deps |
| `REP-201` | done | Zod contract v1 + domainMetrics + remediation links |
| `REP-202` | done | projection tables + outbox apply + lag/rebuild/replay |
| `REP-203` | done | protected aggregates; null deny; dimension redaction |
| `REL-201` | done | Pure fault injection sim + 18 tests; pre/post-commit/retry/DLQ/replay/idempotent |
| `REL-202` | done | Pure concurrency/idempotency sim + 37 tests; autosave/reorder/publish/bulk/inventory/scan/finance/webhook |

## Phase 3 — Structured routing and logistics

| ID | Status | Notes |
|----|--------|-------|
| `ROUTE-301` | done | Schema (migration) + pure helper + service + 28 tests; FK CASCADE prevents orphans |
| `ROUTE-302` | done | Provider registry + cache + rate-limit + telemetry; 24 tests |
| `ROUTE-303` | done | UTC+IANA zone model; DST gap/fold detection; 34 tests |
| `ROUTE-304` | done | 8 constraint checkers + engine; 40 tests; pure; uses ROUTE-301/303 helpers |
| `ROUTE-305` | done | 5 templates + org overrides + assumption disclosure; 26 tests |
| `ROUTE-306` | done | Suggestion engine + explicit adoption + ordinal reorder; 23 tests |
| `ROUTE-307` | done | Scenario workspace: branch/compare/metrics/adopt/share/revoke/archive/rename; 46 tests |
| `ROUTE-308` | done | Viz data model: 5 stop states + 3 leg states + accessible list + legend; 31 tests |
| `ROUTE-309` | done | RouteLegContext + 5 logistics ref types + bundle consistency check; 27 tests |
| `TOUR-301` | done | TourHealthSignal + aggregation engine + threshold eval + freshness; 36 tests |
| `TOUR-302` | done | 9 route/logistics health signals + deriveFrom helpers + summary integration; 29 tests |
| `TRAVEL-301` | done | Party manifest matrix: 4 cell statuses + gap queries + summary; 19 tests |
| `TRAVEL-302` | done | Travel segment state machine (9 statuses) + command executor + idempotency + audit; 21 tests |
| `TRAVEL-303` | done | Bulk assign: 5 conflict types (blocking/overridable), preview+execute; 13 tests |
| `TRAVEL-304` | done | Per-person/group timeline: gap/overlap detection + stale flags + local time; 15 tests |
| `TRAVEL-305` | done | Change impact engine: 7 categories + requires_acknowledgement; 12 tests |
| `TRAVEL-306` | done | Audience projection + version/diff/ack + offline token; 15 tests |
| `TRANS-301` | done | Vehicle master: 3 ownership + 10 classes + capacity/accessibility/sensitive-doc flag; 22 tests |
| `TRANS-302` | done | VehicleMovement: 5-status lifecycle + 6 commands + update + duration helper; 12 tests |
| `TRANS-303` | done | Seat/berth: 5 conflict types (blocking/overridable), overnight/wheelchair checks; 8 tests |
| `TRANS-304` | done | Driver rest/HOS checks: 4 validation codes + policy; 5 tests |
| `TRANS-305` | done | Pickup/dropoff: check-state + delay + estimated ETA + offline instructions; 4 tests |
| `TRANS-306` | done | Movement actuals: mileage/fuel/toll/issue/vendor-followup + finance summary; 6 tests |
| `LODGE-301` | done | Block lifecycle: 5 statuses + confirm requires confirmation_number; 4 tests |
| `LODGE-302` | done | Nightly inventory matrix: contracted/picked-up/assigned/available; 2 tests |
| `LODGE-303` | done | Rooming validation: single/excluded/capacity conflicts; 4 tests |
| `LODGE-304` | done | Occupancy validation: unassigned required persons; 2 tests |
| `LODGE-305` | done | Deadline tracking: past-cutoff + modified-after-cutoff; 3 tests |
| `LODGE-306` | done | Cost estimation: rate × nights × rooms + deposit; 2 tests |
| `LODGE-307` | done | Traveler projection: property/room/roommate names, no IDs; 1 test |
| `LOG-301` | done | Extended statuses + deps/checklist/source-version/completion-validation; 24 tests |
| `LOG-302` | done | Board filter/group/bulk-preview/execute/full-view; 23 tests |
| `EQUIP-301` | done | Asset/type/serial/tag/ownership/vendor/dims/value/state/service-due + finance gate; 27 tests |
| `EQUIP-302` | done | Cases (draft/sealed/open/retired + versioned contents) + manifests (draft→submitted→approved→published immutable snapshot + supersede); 46 tests |
| `EQUIP-303` | done | Movement lifecycle + location derivation + gap/capacity report (4 gap codes, per-leg coverage, unassigned items); 23 tests |
| `EQUIP-304` | done | Scan resolution (QR/barcode/NFC/manual + fuzzy fallback) + CustodyEvent + offline queue (idempotent enqueue/flush/reject/increment) + custody chain + dedup + integrity checks; 27 tests |
| `EQUIP-305` | done | Load-in/out checklist (template from manifest+advance; check/exception/waive/resolve/closeout; exceptions remain open until explicit resolution); 25 tests |
| `EQUIP-306` | done | DamageLossReport (5-state + evidence tokens + custody chain + vendor/insurance/finance + resolution) + ServiceEvent (5-state + parts/cost + history) + IncidentSummary; 30 tests |
| `RENT-301` | done | Agreement lifecycle (8 statuses, draft→reconciled + dispute path + cancel+redraft); line items/costs/pickup/return/contract/PO/invoice; 9 tests |
| `RENT-302` | done | 5 alert detectors (date_overlap/missing_owners/overdue_return/damage_on_return/cost_variance + threshold+escalation); scanRentalAlerts; 20 tests |
| `CATER-301` | done | HospitalityRequirement (source/version/variance tracking + variance summary); 3 tests |
| `CATER-302` | done | MealService (5-status + 6 meal types + window/provider/menu/cost/owner) + timeline conflict detector; 8 tests |
| `CATER-303` | done | Privacy-safe headcount snapshot (dietary+accessibility aggregates; coordinator cap gate for individual exceptions); 3 tests |
| `CATER-304` | done | MenuProposal workflow (proposed→approved→accepted; issue_reported; actual headcount+cost reconciliation); 5 tests |
| `CATER-305` | done | DeliveryChecklistItem (accept/variance/missing; linked to advance/map/task) + summary; 4 tests |
| `CATER-306` | done | ProjectedCrewMealView (personal note only) + ProjectedVendorDeliveryView (aggregates only; no person IDs verified); 3 tests |
| `MAP-301` | done | Version lifecycle: draft/review/approved/published/superseded/archived; immutable published; checksum/thumbnail; audit |
| `MAP-302` | done | Operational links: notes/tasks/markers → 9 target types; groupLinksByTargetType |
| `MAP-303` | done | File/token: type/size/MIME gate + MapShareToken (inactive/expired/revoked/max_uses) + access log struct |
| `MAP-304` | done | Review/approval: comment threads + change requests + approval + computeMapReviewSummary |
| `MAP-305` | done | Projection: audience layer filter + version pin + offline token + assertMapProjectionVersionPin |
| `PUB-301` | done | 11 section keys + SECTION_AUDIENCE_CLASS/REQUIRED/CONTRACT_VERSION + buildTourBookSection + summariseTourBookAssembly |
| `PUB-302` | done | AUDIENCE_VISIBILITY matrix + projectSectionsForRecipient + assertNoProjectionLeak; projection_policy_version recorded |
| `PUB-303` | done | SECTION_OFFLINE_POLICY (cacheable/session_only/no_cache) + buildOfflinePackageManifest + offlinePackageIsUsable; encryption_hint |
| `REP-301` | done | 18 metrics (4 route + 3 travel + 2 lodging + 3 equipment + 3 catering + 3 tasks); denominator/pct/state/severity/freshness/owner/drilldown; worstState aggregation |
| `REL-301` | done | DST gap/fold fixtures (4+3), local-day fixtures + utcToLocalDate/Hour helpers; overnight leg detection; 12 currency exponents + minor-unit conversions; roundHalfEven/roundHalfUp + convertCurrency + sumMinorUnits; 10 address edge cases + validateLogisticsAddress |

## Phase 4 — Workforce, advancing, and live operations

| ID | Status | Notes |
|----|--------|-------|
| `WORK-401` | done | 7-status lifecycle (draft/offered/accepted/declined/confirmed/released/cancelled); date scoping; 5-level field projection; Work Mode link; party summary; 39 tests |
| `WORK-402` | done | 6 column types (show/travel/rehearsal/warehouse/rest/other); filled/partial/open/conflict/N/A cell states; availability-block + status-invalid conflicts; department/type/date/state filters; open-position query; 22 tests |
| `WORK-403` | done | 3-status lifecycle (draft/published/archived); TemplateRole (slot_id, role, dept, headcount, is_required, skill_tags, applies_to_column_types); previewTemplateApplication (create/skip/conflict diff, override mode); executeTemplateApplication (blocked on conflicts); findMatchingTemplates (exact→type/any→any fallback); 26 tests |
| `WORK-404` | done | TimeOff 4-status lifecycle; dateRangesOverlap; expandRecurrence (none/weekly/biweekly/monthly + days_of_week + until_date); 4-type conflict engine (time_off_approved/pending/marked_unavailable/outside_availability); checkBulkAvailability; 26 tests |
| `WORK-405` | done | 7 credential types; 5 verification statuses; CredentialRequirement (type/name/min_level/requires_verification/warn_days/missing_policy/expired_policy); checkRoleCredentials (met/met_expiring/missing/expired/unverified/insufficient_level); checkBulkCredentials; 24 tests |
| `WORK-406` | done | 3 built-in profiles (IATSE/EU/BASIC); 5 checkers; checkLaborRules aggregator; 25 tests |
| `WORK-407` | done | Versioned templates; milestone_offset + fixed_local_time anchors; previewScheduleTemplate (unresolved/conflict/locked_conflict/new + cost est.); applyScheduleTemplate (idempotent; skip locked/conflict/unresolved; override_soft); 23 tests |
| `WORK-408` | done | Idempotent bulk engine; 5 day types; per-candidate result (created/duplicate_idempotency/locked_conflict/soft_conflict/invalid_window); override_soft; skip_summary; 17 tests |
| `WORK-409` | done | 7-status lifecycle; transitionAssignment (reason required for decline/release); offerAssignment; checkReminderEligibility (gap, deadline, status); markReminderSent; requestReplacement (declined/released only, no double-request); summarizeAssignments (by_status + needs_replacement + overdue); 27 tests |
| `WORK-410` | done | Unified conflict model (6 sources); overrideConflict (reason required; no re-override); markConflictRemediated; 3 builder helpers (labor/availability/credential); summarizeConflicts (can_publish gate); 16 tests |
| `WORK-411` | done | RateCard (base/OT multiplier/per diem/travel day rate); computeLaborCostForecast (line items w/ estimated/committed/actual; unknown rate → null total; by_person subtotals; by_department headcount+hours only, no rates); 12 tests |
| `WORK-412` | done | ScheduleSnapshot versioned model; diffScheduleSnapshots (added/updated/removed/unchanged + change_summary); projectScheduleForRecipient (my_shifts/my_diffs/ack_token/ack_deadline/changes_requiring_ack); buildSchedulePublication; applyDeliveryOutcome (delivered/failed → publishing/published/retrying/failed); applyAcknowledgement (token check, no double-ack); 18 tests |
| `HIRE-401` | done | 5-status lifecycle (draft/approval_pending/open/paused/closed); transitionRequisition (approve gate); validateRequisition (invariant + configurable fields); headcount helpers (reserve/release/accept/auto-close); summarizeRequisition (rate withheld); 39 tests |
| `HIRE-402` | done | 12-stage pipeline (received→screening→interview→assessment→offer_pending→offer_extended→accepted/declined/withdrawn/rejected/on_hold/duplicate_blocked); transitionApplicationStage (decision_reason required on reject/decline); notes visibility (3 levels); InterviewTask lifecycle + completeInterviewTask + allRequiredInterviewsComplete; ApplicantConsent + retentionExpiryDate; DuplicateApplicationFlag + isDuplicateBlocking; projectApplicationForExport (role-aware PII redaction); summarizePipeline; 35 tests |
| `HIRE-403` | done | OfferRecord 8-status lifecycle + ContingentAssignment; createOfferFromApprovedApplication; acceptOffer (fill headcount + auto-close); failOffer (decline/withdraw/expire/supersede → release reservation); isOfferExpired; summarizeOffer (rate withheld); 25 tests |
| `HIRE-404` | done | OnboardingTemplate versioned model (draft/active/archived); createTemplateVersion (archives current, creates draft next; immutable); activateTemplate; applyTemplate (role+employment_type filter; item snapshot); validateTemplateItems (ordinal uniqueness, empty title, document/ack rules); 18 tests |
| `HIRE-405` | done | 9 dependency categories (identity_invite/document/credential/policy_ack/payment_payroll/emergency_profile/travel_profile/equipment_issuance/task); 5-status lifecycle + transitionOnboardingItem (waive requires reason); completeOnboardingItem/waiveOnboardingItem/blockOnboardingItem; parseDurationDays + computeDueDate (P_D offsets); buildDependencyItems (from instance snapshot); computeOnboardingCompletion (can_complete gate + blocking_items); getOverdueItems; 28 tests |
| `HIRE-406` | done | ConversionRecord step-machine (6 steps in order: create_org_person/create_tour_role/grant_work_mode/update_onboarding/update_offer/update_requisition); markStepComplete (idempotent per step); markStepFailed; rollbackConversion (idempotent; blocks on complete); resetConversionForRetry (failed/rolled_back only; resumes from last completed step); nextPendingStep; isConversionDuplicate; summarizeConversion; conversionIdempotencyKey; 27 tests |
| `ADV-401` | done | AdvanceTemplate versioned model (draft/active/archived); section/field defs w/ conditional requirements, select/file/validation rules; createAdvanceTemplateVersion (archives current; immutable); activateAdvanceTemplate; validateAdvanceTemplate (sections, field labels, select options, file_config, conditional refs); parseDurationDaysAdv; applyAdvanceTemplate (snapshot, due-date derivation, independence from template mutation); summarizeAdvanceTemplate; 30 tests |
| `ADV-402` | done | Stop×section matrix; AdvanceMatrixCell/Row; computeRollupStatus (blocked>needs_changes>not_started>in_progress>submitted>approved); buildAdvanceMatrix (not_started default, overdue detection, required counts); filterMatrixRows (section/status/owner/overdue/external/category); previewBulkAssignOwner (overwrite detection); buildBulkRemindTargets (owner+non-terminal); previewBulkApplyTemplate (new/existing/skipped_approved); summarizeAdvanceMatrix; 25 tests |
| `ADV-403` | done | ExternalAdvanceToken (4-status: active/used/expired/revoked/submitted; section-scoped); isTokenUsable (expiry + access-count check); recordTokenAccess (auto-expire on max_access_count); revokeToken (idempotent); submitToken; checkTokenScope (event+section enumeration ban); verifyExternalIdentity (none/email_match case-insensitive/passcode/magic_link); upsertDraftEntry (idempotent by token+section+field); ExternalUploadSlot + markSlotUploaded/ScanResult/isUploadUsable; 30 tests |
| `ADV-404` | done | Typed AdvanceFieldValue (text/number/bool/date/time/datetime/contact/address/file_ref/select/multiselect/richtext); validateFieldValue (missing/invalid/pending_scan/valid; min/max length/value/regex rules; contact+address struct; file limits+MIME+scan clearance); upsertFieldResponse (creates or updates + revision history entry); summarizeSectionValidation (can_submit gate); 39 tests |
| `ADV-405` | done | AdvanceSectionRecord with 6-status lifecycle (not_started/in_progress/submitted/needs_changes/approved/reopened); transitionSectionStatus (reopen requires reason); assignSectionOwner (replaces existing); addSectionParticipant (idempotent); addSectionComment/resolveChangeRequest/hasOpenChangeRequests; changeSectionStatus (approval record + audit); changeSectionDueDate; canApproveSection (submitted + no open CRs); immutable audit trail; 28 tests |
| `ADV-406` | done | ReminderType (approaching_due/due_today/overdue/escalation); ReminderRecipientPreferences (channels+TZ+DND+opt_out); AdvanceEscalationPolicy; buildReminderDedupKey; scheduleReminder (idempotent dedup); computeReminderSchedule (7d/3d/1d approaching, overdue, critical escalation after threshold); markReminderDispatched (idempotent); shouldSkipReminderDelivery; recordReminderDelivery; 19 tests |
| `ADV-407` | done | VarianceCategory (7: rider/production/staffing/route/equipment/hospitality/curfew/budget); TourStandardEntry + LocalResponseValue; detectVariances (MISSING flag, numeric tolerance, case-insensitive string compare); assignVarianceFinding; transitionVarianceFinding (waive requires reason; blocks on terminal); summarizeVariances (can_publish gate + by_category); 19 tests |
| `ADV-408` | done | FrozenAdvanceVersion (draft/frozen/superseded); checkFreezeReadiness (unapproved sections + blocking variances); freezeAdvanceVersion (v1 with no previous; v2+ supersedes previous; idempotent); diffFrozenVersions (added/updated/removed/unchanged per section hash); buildExportPackageManifest (role-aware section filter + ros_feed_section_ids); summarizeExportManifest; 15 tests |
| `LIVE-401` | done | RosVersion (draft/review/published/superseded/archived); transitionRosVersion; RosItem (local+UTC planned times, duration, dependency/ordered_after, location, owner/role, public+internal notes, template source, actual slot, is_critical, ordinal); makeRosItem factory; addRosItemNote; recordActualTime (non-mutating on planned); addDependency (idempotent + self-dep guard); detectDependencyCycle (DFS); computePlannedEndUtc; publishRosVersion; createNewRosDraft (supersedes published); diffRosItems (added/updated/removed/unchanged + changed_fields); summarizeRosTimeline; 29 tests |
| `LIVE-402` | done | 8 validation codes (overlap/dependency_inversion/dependency_cycle/missing_location/missing_owner/travel_load_conflict/curfew_breach/unstaffed_critical); blocking/warning/info severity; validateRosTimeline aggregator; checkOverlaps (same owner+location); checkDependencyInversions; checkDependencyCycles (DFS); checkMissingLocation (category-aware); checkMissingOwner; checkTravelLoadConflicts (configurable gap); checkCurfewBreaches; checkUnstaffedCritical; RosValidationConfig + DEFAULT; 23 tests |
| `LIVE-403` | done | DaySheet composer; 4-level DaySheetFieldClass (public/crew_only/sensitive/management_only); DaySheetCapabilitySet; 9 source domains (ROS items/travel/lodging/calls/meals/contacts/maps/emergency/weather); composeDaySheet (field-class projection); buildDaySheetRosItems (strips internal notes, maps fields); summarizeDaySheet; 16 tests |
| `LIVE-404` | done | DaySheetPublication (draft/publishing/published/superseded); buildDaySheetPublication (versioned; previous_publication_id); ProjectedDaySheet per recipient; applyDaySheetAcknowledgement (token check; idempotent); applyDeliveryOutcome (retry_count increment on fail; clears error on success); computeRecipientDiffs (hash-based; new recipient = changed); supersedePublication (idempotent); summarizePublication (ack_pending/ack_complete/delivery_failed/can_supersede); 16 tests |
| `LIVE-405` | done | CorrectionSeverity (informational/moderate/critical); CorrectedDomain (9 types); assessCorrectionImpact (CRITICAL_DOMAINS: ros_item/travel/emergency/call_shift; critical wins mixed); createCorrection (auto-severity + reack_required_user_ids); approveCorrection; applyCorrection (supersedes pub; status=superseded_publication); invalidateAcknowledgements (reset token+deadline for reack recipients; non-reack untouched); summarizeCorrection; 17 tests |
| `LIVE-406` | done | RealtimeChannelScope (org/event/sub_scope: all/department/role_group/management); checkChannelAuthorization (org check + capability gate + re-auth pattern); createSubscription/revokeSubscription (idempotent)/markAuthChecked; ReplayBuffer + appendToBuffer (ring eviction) + getCatchUpMessages (seq>lastSeq, sorted); nextSequenceNumber (monotonic counter); isMessageVisibleToSubscriber (scope filter + revoked guard); detectMessageGap; summarizeChannel; 22 tests |
| `LIVE-407` | done | LiveTask model: 5 ref types + priority/status/owner/due/blocked_reason + audit; does not duplicate logistics taxonomy; 37 tests |
| `LIVE-408` | done | Incident: 6-status lifecycle + severity/privacy/participants/response_owner/escalation/resolution/follow-up/evidence/emergency_copy_review + restricted audit projection; 39 tests |
| `LIVE-409` | done | Check-in: eligibility from credential/assignment; admit/deny/duplicate/revoked/offline_queued outcomes; offline queue flush (idempotent); manual override; operator/device audit; 23 tests |
| `LIVE-410` | done | ActualRecord overlay (non-mutating on planned); markActualStart/End/Skipped; reportDelay (reason required); computeTimelineVariance; computeVarianceNotification; summarizeActuals; 26 tests |
| `LIVE-411` | done | 8-section checklist (incidents/equipment/staff_exceptions/attendance/vendor_issues/actual_timings/documents/finance_handoff); signOffSection (blocked on flagged); flagSection; transitionCloseout (complete blocked unless all signed_off); computeCloseoutCompleteness; recordFinanceHandoff; 16 tests |
| `PLAN-401` | done | PlanSectionOwnership (9 sections, 3 policies); PendingPlanChange lifecycle (pending/approved/rejected/withdrawn); checkApprovalAuthorization; approve/reject/withdraw; summarizePendingChanges; 17 tests |
| `PLAN-402` | done | PresenceSession (join/leave/heartbeat/getActive); hasVersionConflict + ConflictResolution (3 strategies); PlanComment (thread+resolve+reopen); PlanNotificationPreference (muted_events, idempotent mute/unmute); 21 tests |
| `PUB-401` | done | reconcileWorkModeAssignments (deterministic create/update/withdraw/unchanged); WorkModeAssignment lifecycle; 5 tests |
| `PUB-402` | done | PublicationAckRecord (pending/acknowledged/overdue/waived); waiveAck/markOverdueAcks/recordReminderSent (idempotent); summarizeAckWorkflow; 10 tests |
| `PUB-403` | done | PublicationChangeNotice (sections+re_ack_policy+remediation_link+recipients); sendChangeNotice; getReAckRequired/acknowledgeChangeNotice; summarizeChangeNotice; 7 tests |
| `PUB-404` | done | EmergencyBroadcast (6 statuses, 3 severities, multi-channel); cancel/supersede/escalate/ack; append-only audit; 14 tests |
| `CAL-401` | done | 10 source types; CalendarReadModel + health; applyCalendarFilter; detectOverlapConflicts; previewCalendarEdit (read-only guard); ICS snapshot; FeedToken lifecycle; 23 tests |
| `CAL-402` | done | (combined with CAL-401) |
| `CAL-403` | done | (combined with CAL-401) |
| `CAL-404` | done | (combined with CAL-401) |
| `CAL-405` | done | (combined with CAL-401) |
| `CAL-406` | done | (combined with CAL-401) |
| `COMMS-401` | done | CommsChannel (cross-org guard, exception_reason); UnifiedInboxItem; outbox retry/dead-letter; quiet hours/override; CommAckRecord (dismiss≠ack); SecureAttachment (revoke/expire/cross-org guard); 32 tests |
| `COMMS-402` | done | (combined with COMMS-401) |
| `COMMS-403` | done | (combined with COMMS-401) |
| `COMMS-404` | done | (combined with COMMS-401) |
| `COMMS-405` | done | (combined with COMMS-401) |
| `COMMS-406` | done | (combined with COMMS-401) |
| `TOUR-401` | done | 8-signal health (workforce/advance/day_sheet/incidents); buildStopHealthSignals + computeStopHealthSummary + buildTourLiveHealthRollup; 7 tests |
| `REP-401` | done | 9 governed Phase 4 live metrics; evaluateMetricSeverity; buildLiveDashboard; computeDashboardSeverity; 9 tests |
| `REL-401` | done | OfflinePackage freshness; reconnect queue (gap detection); revocation simulation; checkContentStaleness (revoked wins); 19 tests |

## Phase 5 — Commercial operations

| ID | Status | Notes |
|----|--------|-------|
| `TIX-501` | done | EventTicketingConfig + validateTicketingConfig + computeAvailabilityPreview; 32 tests (combined TIX-501..507) |
| `TIX-502` | done | InventoryLedgerEntry (9 movement types); reconstructInventoryState; canReserve oversell guard (combined) |
| `TIX-503` | done | AllocationRecord matrix + getAllocationsAtRiskOfExpiry (combined) |
| `TIX-504` | done | CompRequest lifecycle; approveCompRequest/denyCompRequest/issueComp (combined) |
| `TIX-505` | done | PromoCampaign + PromoCode; computePromoDiscount; isPromoRedeemable (combined) |
| `TIX-506` | done | ALLOWED_OPERATIONS per ticket status; createTicketOperation (combined) |
| `TIX-507` | done | StopTicketingSummary; buildTourTicketingWorkspace + stale data flag (combined) |
| `TIX-508` | done | TicketCredential (signed; no PII; revoke/expire; key-version grace period); 24 tests (combined TIX-508..513) |
| `TIX-509` | done | ScannerDevice (active/revoked/lost; isDeviceAuthorized) (combined) |
| `TIX-510` | done | OfflineScan reconciliation + flushOfflineScans idempotent (combined) |
| `TIX-511` | done | computeAdmissionsAnomalies (4 types) (combined) |
| `TIX-512` | done | WebhookEvent (signature/duplicate/quarantine) (combined) |
| `TIX-513` | done | TicketSettlementHandoff; computeSettlementNet; computeSettlementVariance (combined) |
| `FIN-501` | done | FinanceCategory hierarchy + buildCategoryTree; 34 tests (combined FIN-501..507) |
| `FIN-502` | done | BudgetVersion (baseline/forecast/scenario/approved); approveBudgetVersion (immutable); createNextBudgetVersion (combined) |
| `FIN-503` | done | BudgetLine (quantity_rate/fixed/formula); computeBudgetLineTotal; validateBudgetLine (combined) |
| `FIN-504` | done | CommitmentEntry (9 sources); buildBudgetRollup (committed/actuals/remaining/utilization_pct) (combined) |
| `FIN-505` | done | evaluateApprovalPolicy (threshold/separation of duties) (combined) |
| `FIN-506` | done | PurchaseOrder lifecycle (8 statuses); transitionPOStatus (cancel requires reason; sets approved_by) (combined) |
| `FIN-507` | done | matchInvoiceToPO (price/tax variance → exception/partial_match/matched) (combined) |
| `FIN-508` | done | ExpenseReport lifecycle; submitExpense/rejectExpense; 15 tests (combined FIN-508..511) |
| `FIN-509` | done | CashAdvance; computeCashAdvanceOutstanding; isAdvanceOverdue (combined) |
| `FIN-510` | done | PerDiemPolicy; computePerDiemEntitlement (meal deductions; floor 0) (combined) |
| `FIN-511` | done | AppliedFxRate (locked immutable); convertMinorUnits; roundHalfEvenFin; buildFxSummary (unavailable currencies flagged) (combined) |
| `SETTLE-501` | done | Deal templates/formulas; 30 tests |
| `SETTLE-502` | done | Settlement statement workspace (combined) |
| `SETTLE-503` | done | Settlement approval/signoff (combined) |
| `SETTLE-504` | done | Tour closeout/profitability rollup (combined) |
| `VEND-501` | done | Vendor master + search/merge; 32 tests |
| `VEND-502` | done | Compliance document workflow (combined) |
| `VEND-503` | done | Engagement workflow (combined) |
| `VEND-504` | done | RFP/invitation flow (combined) |
| `VEND-505` | done | Quote submission/versioning (combined) |
| `VEND-506` | done | Quote comparison/decision (combined) |
| `VEND-507` | done | Vendor performance closeout (combined) |
| `CONT-501` | done | Versioned template library; 32 tests |
| `CONT-502` | done | Contract draft workspace (combined) |
| `CONT-503` | done | Internal review/approval (combined) |
| `CONT-504` | done | Counterparty negotiation versions (combined) |
| `CONT-505` | done | Signature adapter (combined) |
| `CONT-506` | done | Amendment/termination/renewal (combined) |
| `CONT-507` | done | Obligation tracker (combined) |
| `CONT-508` | done | Contract→PO/invoice/settlement link (combined) |
| `TRAVEL-501` | done | Provider adapter boundary; 33 tests (combined) |
| `TRAVEL-502` | done | Document storage (combined) |
| `TOUR-501` | done | Commercial closeout readiness (combined) |
| `TOUR-502` | done | Cancellation impact workflow (combined) |
| `REP-501` | done | Ticketing dashboard metrics (combined) |
| `REP-502` | done | Finance/profitability dashboard metrics (combined) |
| `REP-503` | done | Vendor/contract dashboard metrics (combined) |
| `REL-501` | done | Provider contract sandboxes (combined) |

## Phase 6 — Reporting and production hardening

| ID | Status | Notes |
|----|--------|-------|
| `REP-601` | done | rep-exp-phase6.ts + 31 tests |
| `REP-602` | done | rep-exp-phase6.ts (combined) |
| `REP-603` | done | rep-exp-phase6.ts (combined) |
| `REP-604` | done | rep-exp-phase6.ts (combined) |
| `EXP-601` | done | rep-exp-phase6.ts (combined) |
| `EXP-602` | done | rep-exp-phase6.ts (combined) |
| `EXP-603` | done | rep-exp-phase6.ts (combined) |
| `EXP-604` | done | rep-exp-phase6.ts (combined) |
| `TOUR-601` | done | tour-phase6.ts + 23 tests |
| `TOUR-602` | done | tour-phase6.ts (combined) |
| `TOUR-603` | done | tour-phase6.ts (combined) |
| `TOUR-604` | done | tour-phase6.ts (combined) |
| `PLAN-602` | done | plan-route-phase6.ts + 19 tests |
| `PLAN-603` | done | plan-route-phase6.ts (combined) |
| `ROUTE-601` | done | plan-route-phase6.ts (combined) |
| `PUB-601` | done | pub-phase6.ts + 16 tests |
| `PUB-602` | done | pub-phase6.ts (combined) |
| `PUB-603` | done | pub-phase6.ts (combined) |
| `PUB-604` | done | pub-phase6.ts (combined) |
| `LIVE-601` | done | live-work-phase6.ts + 25 tests |
| `WORK-601` | done | live-work-phase6.ts (combined) |
| `WORK-602` | done | live-work-phase6.ts (combined) |
| `WORK-603` | done | live-work-phase6.ts (combined) |
| `WORK-604` | done | live-work-phase6.ts (combined) |
| `TRAVEL-601` | done | travel-log-phase6.ts + 26 tests |
| `TRAVEL-602` | done | travel-log-phase6.ts (combined) |
| `LOG-601` | done | travel-log-phase6.ts (combined) |
| `LOG-602` | done | travel-log-phase6.ts (combined) |
| `LOG-603` | done | travel-log-phase6.ts (combined) |
| `TIX-601` | done | tix-phase6.ts + 23 tests |
| `TIX-602` | done | tix-phase6.ts (combined) |
| `TIX-603` | done | tix-phase6.ts (combined) |
| `FIN-601` | done | commercial-phase6.ts + 29 tests |
| `FIN-602` | done | commercial-phase6.ts (combined) |
| `FIN-603` | done | commercial-phase6.ts (combined) |
| `FIN-604` | done | commercial-phase6.ts (combined) |
| `VEND-601` | done | commercial-phase6.ts (combined) |
| `CONT-601` | done | commercial-phase6.ts (combined) |
| `CONT-602` | done | commercial-phase6.ts (combined) |
| `CAL-601` | done | comms-sec-phase6.ts + 32 tests |
| `COMMS-601` | done | comms-sec-phase6.ts (combined) |
| `COMMS-602` | done | comms-sec-phase6.ts (combined) |
| `COMMS-603` | done | comms-sec-phase6.ts (combined) |
| `SEC-601` | done | comms-sec-phase6.ts (combined) |
| `SEC-602` | done | comms-sec-phase6.ts (combined) |
| `SEC-603` | done | comms-sec-phase6.ts (combined) |
| `SEC-604` | done | comms-sec-phase6.ts (combined) |
| `SEC-605` | done | comms-sec-phase6.ts (combined) |
| `REL-601` | done | rel-phase6.ts + 31 tests |
| `REL-602` | done | rel-phase6.ts (combined) |
| `REL-603` | done | rel-phase6.ts (combined) |
| `REL-604` | done | rel-phase6.ts (combined) |
| `REL-605` | done | rel-phase6.ts (combined) |
| `REL-606` | done | rel-phase6.ts (combined) |
| `REL-607` | done | rel-phase6.ts (combined) |
| `REL-608` | done | rel-phase6.ts (combined) |
| `REL-609` | done | rel-phase6.ts (combined) |
| `REL-610` | done | rel-phase6.ts (combined) |
| `REL-611` | done | rel-phase6.ts (combined) |

