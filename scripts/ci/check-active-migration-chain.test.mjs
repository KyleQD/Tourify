import assert from "node:assert/strict"
import test from "node:test"

import { scanMigrationSources } from "./check-active-migration-chain.mjs"

test("detects duplicate policy creation across migrations", () => {
  const failures = scanMigrationSources([
    { file: "20250101000000_first.sql", sql: 'create policy "rows read" on public.rows for select using (true);' },
    { file: "20250102000000_second.sql", sql: 'create policy "rows read" on public.rows for select using (true);' },
  ])
  assert.equal(failures.length, 1)
  assert.match(failures[0], /duplicate policy public\.rows\.rows read/)
})

test("accepts an explicit policy replacement and schema-qualified tables", () => {
  const failures = scanMigrationSources([
    { file: "20250101000000_first.sql", sql: 'create policy "rows read" on public.rows for select using (true);' },
    { file: "20250102000000_second.sql", sql: 'drop policy if exists "rows read" on public.rows; create policy "rows read" on public.rows for select using (false);' },
    { file: "20250103000000_private.sql", sql: 'create policy "queue read" on private.queue for select using (true);' },
  ])
  assert.deepEqual(failures, [])
})

test("does not treat branch-local dynamic policy DDL as duplicate top-level DDL", () => {
  const failures = scanMigrationSources([
    {
      file: "20250101000000_first.sql",
      sql: `do $$ begin execute 'create policy tasks_read on public.tasks for select using (true)'; end $$;`,
    },
    {
      file: "20250102000000_second.sql",
      sql: `do $branch$ begin execute 'create policy tasks_read on public.tasks for select using (false)'; end $branch$;`,
    },
  ])
  assert.deepEqual(failures, [])
})
