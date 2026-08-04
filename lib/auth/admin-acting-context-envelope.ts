import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const MAX_CONTEXT_LIFETIME_SECONDS = 8 * 60 * 60;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const KID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const ALLOWED_CLAIMS = new Set([
  "v",
  "sub",
  "sid",
  "profile_id",
  "org_id",
  "account_type",
  "epoch",
  "iat",
  "exp",
  "nonce",
  "support_grant_id",
]);

export interface AdminActingContextClaims {
  v: 1;
  sub: string;
  /** SHA-256 binding to the Supabase auth session id, never the access token. */
  sid: string;
  profile_id: string;
  org_id: string;
  account_type: "organization";
  epoch: number;
  iat: number;
  exp: number;
  nonce: string;
  support_grant_id?: string;
}

export interface AdminActingContextKeyRing {
  activeKid: string;
  /** Base64url-encoded secrets with at least 32 decoded bytes. */
  keys: Readonly<Record<string, string>>;
}

export type AdminActingContextEnvelopeErrorCode =
  | "invalid_format"
  | "unknown_key"
  | "invalid_signature"
  | "invalid_claims"
  | "expired"
  | "subject_mismatch"
  | "session_mismatch";

export class AdminActingContextEnvelopeError extends Error {
  constructor(public readonly code: AdminActingContextEnvelopeErrorCode) {
    super(code);
    this.name = "AdminActingContextEnvelopeError";
  }
}

function base64urlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function decodeSecret(encoded: string) {
  let secret: Buffer;
  try {
    secret = Buffer.from(encoded, "base64url");
  } catch {
    throw new AdminActingContextEnvelopeError("invalid_claims");
  }
  if (secret.length < 32)
    throw new AdminActingContextEnvelopeError("invalid_claims");
  return secret;
}

function assertClaims(value: unknown): asserts value is AdminActingContextClaims {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AdminActingContextEnvelopeError("invalid_claims");
  const claims = value as Record<string, unknown>;
  if (Object.keys(claims).some((key) => !ALLOWED_CLAIMS.has(key)))
    throw new AdminActingContextEnvelopeError("invalid_claims");
  if (
    claims.v !== 1 ||
    claims.account_type !== "organization" ||
    ![claims.sub, claims.profile_id, claims.org_id, claims.nonce].every(
      (item) => typeof item === "string" && item.length > 0,
    ) ||
    typeof claims.sid !== "string" ||
    !HASH_PATTERN.test(claims.sid) ||
    !Number.isSafeInteger(claims.epoch) ||
    Number(claims.epoch) < 1 ||
    !Number.isSafeInteger(claims.iat) ||
    !Number.isSafeInteger(claims.exp) ||
    Number(claims.exp) <= Number(claims.iat) ||
    Number(claims.exp) - Number(claims.iat) > MAX_CONTEXT_LIFETIME_SECONDS ||
    (claims.support_grant_id !== undefined &&
      (typeof claims.support_grant_id !== "string" || claims.support_grant_id.length === 0))
  ) {
    throw new AdminActingContextEnvelopeError("invalid_claims");
  }
}

function signatureFor(signingInput: string, secret: Buffer) {
  return createHmac("sha256", secret).update(signingInput).digest();
}

export function hashAdminAuthSession(userId: string, authSessionId: string) {
  if (!userId || !authSessionId)
    throw new AdminActingContextEnvelopeError("invalid_claims");
  return createHash("sha256").update(`${userId}|${authSessionId}`).digest("hex");
}

export function hashAdminActingNonce(nonce: string) {
  if (!nonce) throw new AdminActingContextEnvelopeError("invalid_claims");
  return createHash("sha256").update(nonce).digest("hex");
}

export function signAdminActingContextEnvelope(
  claims: AdminActingContextClaims,
  keyRing: AdminActingContextKeyRing,
) {
  assertClaims(claims);
  if (!KID_PATTERN.test(keyRing.activeKid))
    throw new AdminActingContextEnvelopeError("unknown_key");
  const encodedSecret = keyRing.keys[keyRing.activeKid];
  if (!encodedSecret)
    throw new AdminActingContextEnvelopeError("unknown_key");
  const payload = base64urlEncode(JSON.stringify(claims));
  const signingInput = `v1.${keyRing.activeKid}.${payload}`;
  return `${signingInput}.${base64urlEncode(signatureFor(signingInput, decodeSecret(encodedSecret)))}`;
}

export function verifyAdminActingContextEnvelope(
  envelope: string,
  keyRing: AdminActingContextKeyRing,
  expected: { userId: string; authSessionHash: string; nowSeconds?: number },
) {
  const parts = envelope.split(".");
  if (parts.length !== 4 || parts[0] !== "v1" || !KID_PATTERN.test(parts[1]))
    throw new AdminActingContextEnvelopeError("invalid_format");
  const [, kid, payload, encodedSignature] = parts;
  const encodedSecret = keyRing.keys[kid];
  if (!encodedSecret) throw new AdminActingContextEnvelopeError("unknown_key");
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    throw new AdminActingContextEnvelopeError("invalid_format");
  }
  const expectedSignature = signatureFor(
    `v1.${kid}.${payload}`,
    decodeSecret(encodedSecret),
  );
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new AdminActingContextEnvelopeError("invalid_signature");
  }

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new AdminActingContextEnvelopeError("invalid_claims");
  }
  assertClaims(claims);
  if (claims.sub !== expected.userId)
    throw new AdminActingContextEnvelopeError("subject_mismatch");
  if (claims.sid !== expected.authSessionHash)
    throw new AdminActingContextEnvelopeError("session_mismatch");
  if (claims.exp <= (expected.nowSeconds ?? Math.floor(Date.now() / 1000)))
    throw new AdminActingContextEnvelopeError("expired");
  return claims;
}

export function buildAdminActingContextKey(input: {
  userId: string;
  authSessionHash: string;
  profileId: string;
  orgId: string;
  epoch: number;
  membershipVersion: string;
  capabilityVersion: string;
}) {
  return createHash("sha256")
    .update(
      [
        input.userId,
        input.authSessionHash,
        input.profileId,
        input.orgId,
        String(input.epoch),
        input.membershipVersion,
        input.capabilityVersion,
      ].join("|"),
    )
    .digest("hex");
}
