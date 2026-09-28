import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Work Mode overview contracts", () => {
  it("makes Overview canonical while preserving the legacy Today route", () => {
    expect(read("lib/work-mode/navigation.ts")).toContain(
      '{ id: "overview", label: "Overview"',
    );
    expect(read("app/work/page.tsx")).toContain('redirect("/work/overview")');
    expect(read("app/work/[view]/page.tsx")).toContain('view === "today"');
    expect(read("lib/rebuild/shift-assignment-notify.ts")).toContain(
      "/work/overview?assignment=",
    );
  });

  it("renders cross-assignment attention, event positions, summaries, and an accessible message dialog", () => {
    const overview = read("components/work-mode/work-mode-overview.tsx");
    for (const label of [
      "Needs your attention",
      "Upcoming positions",
      "Tasks",
      "Updates",
      "Messages",
      "Reminders",
    ]) {
      expect(overview).toContain(label);
    }
    expect(overview).toContain("DialogDescription");
    expect(overview).toContain("onCommunicationResponse");
  });

  it("adds organization-scoped scheduled reminders and removes permissive communication reads", () => {
    const migration = read(
      "supabase/migrations/20260911013017_work_mode_overview_communications.sql",
    );
    expect(migration).toContain("add column if not exists org_id uuid");
    expect(migration).toContain(
      "add column if not exists remind_at timestamptz",
    );
    expect(migration).toContain("drop policy if exists read_all_comms");
    expect(migration).toContain("assignment.status in ('confirmed', 'active')");
  });

  it("keeps successful sources visible when publications or communications fail", () => {
    const readModel = read("lib/work-mode/read-model.ts");
    expect(readModel).toContain('availability.publications = "unavailable"');
    expect(readModel).toContain('availability.communications = "unavailable"');
    expect(readModel).not.toContain(
      'throw new WorkModeReadError("Assignments loaded, but published work packets are unavailable.")',
    );
  });
});
