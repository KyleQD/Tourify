import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260825030000_analytics_truth.sql"),
  "utf8",
)

describe("VEN-183 analytics truth migration", () => {
  it("creates the recorded-money source before analytics routines use it", () => {
    const tableAt = sql.search(/create table if not exists public\.venue_manual_transactions/i)
    const dashboardAt = sql.search(/create or replace function public\.get_venue_dashboard_stats/i)

    expect(tableAt).toBeGreaterThanOrEqual(0)
    expect(dashboardAt).toBeGreaterThan(tableAt)
    expect(sql).toMatch(/alter table public\.venue_manual_transactions enable row level security/i)
  })

  it("keeps the ledger behind permission-checked service routes", () => {
    expect(sql).not.toMatch(/create policy\s+\w+\s+on public\.venue_manual_transactions/i)
    expect(sql).toMatch(/direct client access is denied/i)
  })

  it("fails the migration when the required backfill fails", () => {
    const backfill = sql.match(
      /-- ── 3\.[\s\S]*?perform public\.refresh_venue_analytics_daily\(30\);[\s\S]*?end \$\$;/i,
    )?.[0]

    expect(backfill).toBeTruthy()
    expect(backfill).not.toMatch(/exception when others/i)
  })

  it("keeps rollup execution service-only", () => {
    expect(sql).toMatch(
      /revoke all on function public\.refresh_venue_analytics_daily\(int\) from public, anon, authenticated/i,
    )
    expect(sql).toMatch(
      /grant execute on function public\.refresh_venue_analytics_daily\(int\) to service_role/i,
    )
  })
})
