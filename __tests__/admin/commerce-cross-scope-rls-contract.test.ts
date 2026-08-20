import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const migration = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const marketplaceCore = migration("supabase/migrations/20260410120000_marketplace_core.sql")
const ticketingFoundation = migration("supabase/migrations/20260712120000_event_ticketing_foundation.sql")
const settlements = migration("supabase/migrations/20260602130000_settlements.sql")
const feeRules = migration("supabase/migrations/20260728000010_marketplace_fee_rules.sql")

const marketplaceRlsTables = [
  "marketplace_storefronts",
  "marketplace_listings",
  "marketplace_listing_variants",
  "marketplace_orders",
  "marketplace_order_items",
  "marketplace_entitlements",
  "marketplace_payout_ledger",
  "marketplace_moderation_queue",
  "marketplace_service_milestones",
  "marketplace_integrations",
]

const ticketingRlsTables = [
  "event_ticketing_config",
  "ticket_inventory_reservations",
  "tickets",
  "ticket_credentials",
  "ticket_ownership_events",
  "ticket_transfers",
  "ticket_checkins",
  "ticket_allocations",
  "ticket_revenue_allocations",
  "event_ticketing_grants",
  "ticket_stripe_webhook_events",
  "ticket_analytics_events",
]

describe("COM-041 Commerce cross-scope RLS contract", () => {
  it("keeps marketplace commerce tables under RLS", () => {
    for (const table of marketplaceRlsTables) {
      expect(marketplaceCore, table).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it("keeps marketplace order, entitlement, payout, and integration policies participant scoped", () => {
    expect(marketplaceCore).toContain("marketplace_orders_participant_read")
    expect(marketplaceCore).toContain("auth.uid() = buyer_user_id or auth.uid() = seller_user_id")
    expect(marketplaceCore).toContain("marketplace_order_items_participant_read")
    expect(marketplaceCore).toContain("marketplace_entitlements_buyer_read")
    expect(marketplaceCore).toContain("marketplace_payout_seller_read")
    expect(marketplaceCore).toContain("for select using (auth.uid() = seller_user_id)")
    expect(marketplaceCore).toContain("marketplace_integrations_owner_manage")
    expect(marketplaceCore).toContain("with check (auth.uid() = seller_user_id)")
  })

  it("keeps event ticketing tables under event/member scoped RLS", () => {
    for (const table of ticketingRlsTables) {
      expect(ticketingFoundation, table).toContain(`alter table ${table} enable row level security`)
    }
    expect(ticketingFoundation).toContain("create or replace function is_event_v2_org_member")
    expect(ticketingFoundation).toContain("create or replace function has_event_ticketing_grant")
    expect(ticketingFoundation).toContain("is_event_v2_org_member(event_id)")
    expect(ticketingFoundation).toContain("ticket_stripe_webhook_events_deny")
    expect(ticketingFoundation).toContain("for all using (false) with check (false)")
  })

  it("keeps finance settlements scoped by organization membership", () => {
    expect(settlements).toContain("alter table settlements enable row level security")
    expect(settlements).toContain("create policy settlements_select")
    expect(settlements).toContain("org_id in (select org_id from org_members where user_id = auth.uid())")
    expect(settlements).toContain("create policy settlements_write")
  })

  it("keeps fee rule RLS visible as a legacy global admin policy pending canonical org scoping", () => {
    expect(feeRules).toContain("alter table public.marketplace_fee_rules enable row level security")
    expect(feeRules).toContain("marketplace_fee_rules_admin_manage")
    expect(feeRules).toContain("p.role = 'admin'")
    expect(feeRules).not.toContain("org_id")
  })
})
