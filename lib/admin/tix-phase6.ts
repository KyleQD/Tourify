/**
 * tix-phase6.ts — TIX-601..603
 *
 * Phase 6 ticketing: migration/reconciliation, security review model, retirement plan.
 *  TIX-601: Migrate/reconcile legacy data
 *  TIX-602: Ticketing security/load review checks
 *  TIX-603: Retire old routes/tables/policies
 *
 * Pure domain logic only. No Supabase imports. No mocks.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIX-601 — Migrate/reconcile legacy data
// ─────────────────────────────────────────────────────────────────────────────

export interface TicketingReconciliationRow {
  org_id: string;
  event_id: string;
  legacy_sold: number;
  canonical_sold: number;
  legacy_revenue_minor: number;
  canonical_revenue_minor: number;
  currency: string;
  delta_sold: number;
  delta_revenue_minor: number;
  within_tolerance: boolean;
}

export interface TicketingMigrationStatus {
  event_id: string;
  org_id: string;
  legacy_writes_disabled: boolean;
  canonical_reads_enabled: boolean;
  reconciliation_row?: TicketingReconciliationRow;
  unresolved_records: number;
  status: 'pending' | 'in_progress' | 'reconciled' | 'blocked' | 'retired';
}

export function buildTicketingReconciliationRow(
  org_id: string,
  event_id: string,
  currency: string,
  legacy_sold: number,
  canonical_sold: number,
  legacy_revenue_minor: number,
  canonical_revenue_minor: number,
  tolerance_pct: number,
): TicketingReconciliationRow {
  const delta_sold = Math.abs(canonical_sold - legacy_sold);
  const delta_revenue_minor = Math.abs(canonical_revenue_minor - legacy_revenue_minor);
  const revenue_tolerance = legacy_revenue_minor * (tolerance_pct / 100);
  const within_tolerance = delta_sold === 0 && delta_revenue_minor <= revenue_tolerance;
  return {
    org_id, event_id, legacy_sold, canonical_sold, legacy_revenue_minor,
    canonical_revenue_minor, currency, delta_sold, delta_revenue_minor, within_tolerance,
  };
}

export function canRetireEventLegacyData(status: TicketingMigrationStatus): {
  can_retire: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (!status.legacy_writes_disabled) blockers.push('Legacy writes not yet disabled');
  if (!status.canonical_reads_enabled) blockers.push('Canonical reads not enabled');
  if (status.unresolved_records > 0) blockers.push(`${status.unresolved_records} unresolved records`);
  if (status.reconciliation_row && !status.reconciliation_row.within_tolerance) {
    blockers.push('Reconciliation variance exceeds tolerance');
  }
  return { can_retire: blockers.length === 0, blockers };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIX-602 — Security/load review checks
// ─────────────────────────────────────────────────────────────────────────────

export type TicketingSecurityCheckType =
  | 'oversell_race' | 'idor_prevention' | 'promo_abuse' | 'scanner_forgery_replay'
  | 'offline_duplication' | 'refund_privilege' | 'webhook_attack' | 'high_volume_scan';

export interface TicketingSecurityCheck {
  check_type: TicketingSecurityCheckType;
  description: string;
  passed: boolean;
  notes?: string;
  severity: 'blocker' | 'high' | 'medium';
}

export function runTicketingSecurityChecklist(
  check_results: Omit<TicketingSecurityCheck, 'description'>[],
): {
  checks: TicketingSecurityCheck[];
  has_blockers: boolean;
  has_high: boolean;
  can_release: boolean;
} {
  const descriptions: Record<TicketingSecurityCheckType, string> = {
    oversell_race: 'Concurrent reserve/release does not allow oversell',
    idor_prevention: 'Ticket/order IDs cannot be guessed or enumerated across orgs',
    promo_abuse: 'Rate-limit and cap enforce promo code limits under load',
    scanner_forgery_replay: 'Forged/replayed scan credentials are rejected',
    offline_duplication: 'Offline scan queue deduplicates on reconnect',
    refund_privilege: 'Refund requires capability + reason; bulk refund requires SoD',
    webhook_attack: 'Provider webhook rejects unsigned/replayed payloads',
    high_volume_scan: 'Check-in sustains 200/min per gate without degradation',
  };
  const checks: TicketingSecurityCheck[] = check_results.map(c => ({
    ...c, description: descriptions[c.check_type],
  }));
  const has_blockers = checks.some(c => c.severity === 'blocker' && !c.passed);
  const has_high = checks.some(c => c.severity === 'high' && !c.passed);
  return { checks, has_blockers, has_high, can_release: !has_blockers && !has_high };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIX-603 — Retire old routes/tables/policies
// ─────────────────────────────────────────────────────────────────────────────

export interface TicketingRetirementItem {
  item_id: string;
  item_type: 'route' | 'table' | 'rls_policy' | 'job' | 'ui_component';
  identifier: string;
  current_usage_count: number;
  canonical_replacement: string;
  historical_reads_preserved: boolean;
  permissive_policy_absent: boolean;
  retired_at?: string;
  status: 'pending' | 'ready' | 'retired' | 'blocked';
}

export function assessRetirementReadiness(item: TicketingRetirementItem): {
  ready: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (item.current_usage_count > 0) blockers.push(`Still has ${item.current_usage_count} active usage(s)`);
  if (!item.historical_reads_preserved) blockers.push('Historical reads not verified as preserved');
  if (!item.permissive_policy_absent) blockers.push('Permissive policy still exists');
  return { ready: blockers.length === 0, blockers };
}

export function buildRetirementSummary(items: TicketingRetirementItem[]): {
  total: number;
  retired: number;
  ready: number;
  blocked: number;
  pending: number;
  all_retired: boolean;
} {
  const retired = items.filter(i => i.status === 'retired').length;
  const ready = items.filter(i => i.status === 'ready').length;
  const blocked = items.filter(i => i.status === 'blocked').length;
  const pending = items.filter(i => i.status === 'pending').length;
  return { total: items.length, retired, ready, blocked, pending, all_retired: retired === items.length };
}
