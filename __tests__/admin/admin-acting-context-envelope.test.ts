import { describe, expect, it } from "vitest";

import {
  AdminActingContextEnvelopeError,
  buildAdminActingContextKey,
  hashAdminActingNonce,
  hashAdminAuthSession,
  signAdminActingContextEnvelope,
  verifyAdminActingContextEnvelope,
  type AdminActingContextClaims,
} from "@/lib/auth/admin-acting-context-envelope";

const keyA = Buffer.alloc(32, 1).toString("base64url");
const keyB = Buffer.alloc(32, 2).toString("base64url");
const sessionHash = hashAdminAuthSession("user-a", "session-a");
const claims: AdminActingContextClaims = {
  v: 1,
  sub: "user-a",
  sid: sessionHash,
  profile_id: "profile-a",
  org_id: "org-a",
  account_type: "organization",
  epoch: 3,
  iat: 1_800_000_000,
  exp: 1_800_028_800,
  nonce: "nonce-a",
};

describe("SEC-101 signed acting-context envelope", () => {
  it("signs, verifies, and supports overlapping rotation keys", () => {
    const signed = signAdminActingContextEnvelope(claims, {
      activeKid: "old",
      keys: { old: keyA, next: keyB },
    });
    expect(
      verifyAdminActingContextEnvelope(
        signed,
        { activeKid: "next", keys: { old: keyA, next: keyB } },
        { userId: "user-a", authSessionHash: sessionHash, nowSeconds: claims.iat },
      ),
    ).toEqual(claims);
  });

  it("rejects tampering, wrong subject/session, and expiry", () => {
    const ring = { activeKid: "a", keys: { a: keyA } };
    const signed = signAdminActingContextEnvelope(claims, ring);
    const tampered = `${signed.slice(0, -1)}${signed.endsWith("a") ? "b" : "a"}`;
    expect(() =>
      verifyAdminActingContextEnvelope(tampered, ring, {
        userId: "user-a",
        authSessionHash: sessionHash,
        nowSeconds: claims.iat,
      }),
    ).toThrowError(AdminActingContextEnvelopeError);
    expect(() =>
      verifyAdminActingContextEnvelope(signed, ring, {
        userId: "user-b",
        authSessionHash: sessionHash,
        nowSeconds: claims.iat,
      }),
    ).toThrowError(expect.objectContaining({ code: "subject_mismatch" }));
    expect(() =>
      verifyAdminActingContextEnvelope(signed, ring, {
        userId: "user-a",
        authSessionHash: hashAdminAuthSession("user-a", "session-b"),
        nowSeconds: claims.iat,
      }),
    ).toThrowError(expect.objectContaining({ code: "session_mismatch" }));
    expect(() =>
      verifyAdminActingContextEnvelope(signed, ring, {
        userId: "user-a",
        authSessionHash: sessionHash,
        nowSeconds: claims.exp,
      }),
    ).toThrowError(expect.objectContaining({ code: "expired" }));
  });

  it("rejects excessive lifetime and unknown claim injection", () => {
    const ring = { activeKid: "a", keys: { a: keyA } };
    expect(() =>
      signAdminActingContextEnvelope({ ...claims, exp: claims.iat + 28_801 }, ring),
    ).toThrowError(expect.objectContaining({ code: "invalid_claims" }));
    expect(() =>
      signAdminActingContextEnvelope({ ...claims, injected: true } as AdminActingContextClaims, ring),
    ).toThrowError(expect.objectContaining({ code: "invalid_claims" }));
  });

  it("hashes session/nonce and keys the full context version", () => {
    expect(sessionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAdminActingNonce("nonce-a")).toMatch(/^[0-9a-f]{64}$/);
    const base = {
      userId: "user-a",
      authSessionHash: sessionHash,
      profileId: "profile-a",
      orgId: "org-a",
      epoch: 3,
      membershipVersion: "membership-v1",
      capabilityVersion: "capability-v1",
    };
    expect(buildAdminActingContextKey(base)).not.toBe(
      buildAdminActingContextKey({ ...base, epoch: 4 }),
    );
    expect(buildAdminActingContextKey(base)).not.toBe(
      buildAdminActingContextKey({ ...base, capabilityVersion: "capability-v2" }),
    );
  });
});
