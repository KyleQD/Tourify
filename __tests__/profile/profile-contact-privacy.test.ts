import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { buildGeneralPublicIdentity } from "@/lib/profile/general-public-profile";

/**
 * DB-008 / Wave 35 — USER-005 phone-privacy contract.
 *
 * The defect being pinned: `profiles` has a real boolean column `show_phone`
 * (supabase/migrations/20250819100000_profiles_expand_fields.sql:49-51) and NO
 * `phone` column in any active migration or in `lib/database.types.ts`. Code that
 * read `profile.phone` therefore type-checked and returned `null` — a privacy flag
 * that gated nothing. The canonical phone storage is `profiles.profile_data.phone`.
 */
const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * Comments are stripped before every source assertion. The repair comments in these
 * files name the phantom columns and the dead RPC on purpose, so a naive substring
 * scan would flag the documentation of the fix as the defect.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function readRepoFile(relative: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

function readRepoCode(relative: string): string {
  return stripComments(readRepoFile(relative));
}

/** Balanced-bracket slice starting at `open` (the index of the opening bracket). */
function sliceBalanced(source: string, open: number): string {
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (pairs[ch]) {
      stack.push(pairs[ch]);
      continue;
    }
    if (ch === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

/** Every column name that appears in a Supabase `.select(...)` argument. */
function selectColumns(source: string): string[] {
  const columns: string[] = [];
  const pattern = /\.select\(\s*`/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const start = source.indexOf("(", match.index);
    const end = source.indexOf("`", start);
    columns.push(
      ...source
        .slice(end + 1, source.indexOf(")", start))
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    );
  }
  return columns;
}

/** Every top-level key written by a Supabase `.update({...})` / `.insert({...})`. */
function writePayloadKeys(source: string): string[] {
  const keys: string[] = [];
  const pattern = /\.(?:update|insert)\(\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const start = source.indexOf("{", match.index);
    const body = sliceBalanced(source, start);
    for (const entry of body.slice(1, -1).split(/,(?![^{[]*[\]}])/)) {
      const key = entry.split(":")[0].trim();
      if (key) keys.push(key);
    }
  }
  return keys;
}

/** Every column used as a PostgREST filter. */
function filterColumns(source: string): string[] {
  return [...source.matchAll(/\.(?:eq|neq|gt|gte|lt|lte|like|ilike)\(\s*['"]([\w.]+)['"]/g)].map(
    (m) => m[1],
  );
}

describe("show_phone is a real gate, not a phone source", () => {
  it("strips profile_data.phone for every non-true show_phone value", () => {
    for (const showPhone of [false, null, undefined, 0, "true" as unknown as boolean]) {
      const result = buildGeneralPublicIdentity({
        id: "user-1",
        username: "alex",
        show_phone: showPhone,
        profile_data: { phone: "555-0100" },
      });

      expect(result.profileData, `show_phone=${String(showPhone)}`).not.toHaveProperty(
        "phone",
      );
    }
  });

  it("exposes profile_data.phone only when show_phone is exactly true", () => {
    const result = buildGeneralPublicIdentity({
      id: "user-1",
      username: "alex",
      show_phone: true,
      profile_data: { phone: "555-0100" },
    });

    expect(result.profileData.phone).toBe("555-0100");
  });

  it("never mutates the caller-supplied profile_data object", () => {
    const profileData = { phone: "555-0100" };
    buildGeneralPublicIdentity({
      id: "user-1",
      username: "alex",
      show_phone: false,
      profile_data: profileData,
    });

    expect(profileData.phone).toBe("555-0100");
  });

  it("applies the same fail-closed rule to email and location", () => {
    const result = buildGeneralPublicIdentity({
      id: "user-1",
      username: "alex",
      show_email: false,
      show_phone: false,
      show_location: false,
      location: "Los Angeles",
      profile_data: { email: "alex@example.com", location: "Los Angeles" },
      social_links: { email: "alex@example.com" },
    });

    expect(result.profileData).not.toHaveProperty("email");
    // `location` is nulled rather than deleted, so the invariant is that the
    // private value never survives, not that the key is absent.
    expect(result.profileData.location).toBeNull();
    expect(result.profileData.location).not.toBe("Los Angeles");
    expect(result.socialLinks).not.toHaveProperty("email");
    expect(result.location).toBeNull();
  });

  it("returns a gate whose output the call site can use without an untyped cast", () => {
    // Regression: the gate's inferred return type previously collapsed to
    // `{ website: ... }`, which forced the caller at
    // app/api/profile/[username]/route.ts to spread an undeclared identifier
    // (`baseSocialLinks`) and throw a ReferenceError at runtime.
    const result = buildGeneralPublicIdentity({
      id: "user-1",
      username: "alex",
      social_links: { instagram: "alex" },
    });

    expect(result.socialLinks.instagram).toBe("alex");
    expect(result.profileData.name).toBe("alex");
  });
});

describe("general-user surfaces never read the phantom profiles.phone column", () => {
  const ownedFiles = [
    "app/api/profile/custom-design/route.ts",
    "app/api/profile/update/route.ts",
    "app/api/profile/update-optimized/route.ts",
    "app/api/settings/profile/route.ts",
    "app/api/settings/route.ts",
    "lib/profile/general-public-profile.ts",
    "lib/profile/custom-profile-prompt.ts",
  ];

  // Naming any phantom column in a select, a write payload or a filter makes
  // PostgREST reject the whole statement, so one stale identifier silently takes
  // an entire route offline. These are structural checks, not substring checks:
  // `show_phone` legitimately contains the text `phone`.
  const PHANTOM_COLUMNS = ["custom_url", "phone", "spotify", "verified"];

  it.each(ownedFiles)("%s names no phantom profiles column", (file) => {
    const source = readRepoCode(file);
    const used = [
      ...selectColumns(source),
      ...writePayloadKeys(source),
      ...filterColumns(source),
    ];

    const offenders = [...new Set(used)].filter(
      (column) => PHANTOM_COLUMNS.includes(column) && !column.includes("."),
    );
    expect(offenders, `${file} writes/reads phantom columns`).toEqual([]);
  });

  it("custom-design preview keeps the gate and reads the canonical storage", () => {
    const source = readRepoCode("app/api/profile/custom-design/route.ts");
    expect(source).toContain("phone: profile.show_phone === true ? storedPhone : null");
    expect(source).toContain("profileData.phone");
    expect(source).not.toContain("profile.show_phone === true ? profile.phone");
  });

  it("the LLM prompt snapshot stays fail-closed on phone", () => {
    // lib/profile/custom-profile-prompt.ts is serialized into a third-party model
    // prompt. Repointing the phantom read there would make a real phone number
    // reachable by a model, so the value must stay explicitly null.
    const source = readRepoCode("lib/profile/custom-profile-prompt.ts");
    expect(source).toMatch(/^\s*phone: null,$/m);
    expect(source).not.toContain("asString(profile.phone)");
  });

  it("/api/profile/update does not gain a top-level show_phone column write", () => {
    // Widening guard: app/api/settings/profile/route.ts is the only route that may
    // set the publication gate. If this route ever starts writing the column, a
    // third settings form gains the ability to publish a phone number.
    const source = readRepoCode("app/api/profile/update/route.ts");
    expect(source).not.toMatch(/profileUpdate\.show_phone/);
    expect(source).not.toMatch(/profileUpdate\.phone/);
    expect(source).toContain("profileUpdate.profile_data");
  });
});

describe("custom_url was repointed to the canonical profiles.username handle", () => {
  it("no general-user profile route selects, filters or writes the column", () => {
    const offenders: string[] = [];

    for (const file of [
      "app/api/profile/create/route.ts",
      "app/api/profile/check-url/route.ts",
      "app/api/profile/current/route.ts",
      "app/api/profile/update/route.ts",
      "app/api/profile/update-optimized/route.ts",
      "app/api/profile/[username]/route.ts",
      "app/api/profile/[username]/recognition/route.ts",
      "app/api/settings/profile/route.ts",
      "lib/seo/public-preview-readers.ts",
    ]) {
      const source = readRepoCode(file);
      const used = [
        ...selectColumns(source),
        ...writePayloadKeys(source),
        ...filterColumns(source),
      ];
      if (used.includes("custom_url")) offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });

  it("the dead calculate_venue_profile_completion RPC call is gone", () => {
    expect(readRepoCode("app/api/settings/route.ts")).not.toContain(
      "calculate_venue_profile_completion",
    );
  });

  it("the deprecated response alias still carries the canonical handle", () => {
    for (const file of [
      "app/api/profile/current/route.ts",
      "app/api/profile/update/route.ts",
      "app/api/profile/update-optimized/route.ts",
    ]) {
      expect(readRepoCode(file), file).toMatch(/custom_url: (profile|updatedProfile)\.username/);
    }
  });
});
