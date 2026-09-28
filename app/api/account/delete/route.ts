export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createRateLimiter } from "@/lib/utils/rate-limit";

/**
 * GDPR/CCPA self-service account deletion (AUDIT M18 / WS-2.4).
 *
 * Contract:
 *  - Requires a VERIFIED session and an explicit typed confirmation.
 *  - Scrubs known PII that survives auth-user deletion via ON DELETE SET NULL
 *    (job application contact fields), removes the user's storage objects,
 *    writes a deletion audit row, then deletes the auth user — which cascades
 *    to FK-linked profile content.
 *
 * Known limitation (documented in docs/AUDIT_FINDINGS): tables WITHOUT foreign
 * keys to auth.users are not covered by cascade; a full data-map pass is
 * tracked in the backlog as erasure coverage expands.
 */

const bodySchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
});

const PII_SURVIVOR_TABLES: Array<{
  table: string;
  matchColumn: string;
  scrub: Record<string, null>;
}> = [
  {
    // Applicant contact fields survive user deletion (SET NULL FKs only on ids).
    table: "job_applications",
    matchColumn: "applicant_id",
    scrub: { applicant_email: null, applicant_phone: null },
  },
];

const AUTH_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_DELETE_BATCH_SIZE = 1000;
const MAX_STORAGE_DELETE_BATCHES_PER_PREFIX = 10_000;

function storageTargetsForUser(userId: string) {
  if (!AUTH_USER_ID_PATTERN.test(userId)) return null;

  return [
    { bucket: "avatars", prefixes: [`${userId}/`] },
    {
      bucket: "profile-images",
      // Keep the historical certification location in deletion coverage.
      prefixes: [`${userId}/`, `staff-credentials/${userId}/`],
    },
    {
      bucket: "private-docs",
      // Current certification uploads use this second, user-bound prefix.
      prefixes: [`${userId}/`, `staff-credentials/${userId}/`],
    },
  ] as const;
}

function isSafeListedObjectName(name: unknown): name is string {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    name !== "." &&
    name !== ".." &&
    name !== ".emptyFolderPlaceholder" &&
    !/[\\/\u0000-\u001f\u007f]/.test(name)
  );
}

async function removeStorageForUser(
  svc: ReturnType<typeof createServiceRoleClient>,
  userId: string,
) {
  const failures: string[] = [];
  const targets = storageTargetsForUser(userId);
  if (!targets) return ["identity:invalid"];

  for (const { bucket, prefixes } of targets) {
    try {
      for (const prefix of prefixes) {
        const removedPaths = new Set<string>();
        let removedBatchCount = 0;

        while (true) {
          if (removedBatchCount >= MAX_STORAGE_DELETE_BATCHES_PER_PREFIX) {
            failures.push(`${bucket}:${prefix}:batch-limit`);
            break;
          }

          // Always re-list from offset zero. Advancing an offset after removing
          // a page would skip objects as the remaining rows shift forward.
          const { data: objects, error: listError } = await svc.storage
            .from(bucket)
            .list(prefix, {
              limit: STORAGE_DELETE_BATCH_SIZE,
              offset: 0,
            });
          if (listError) {
            const message = String(listError.message || listError);
            if (
              removedBatchCount === 0 &&
              /bucket not found|not found/i.test(message)
            )
              break;
            failures.push(`${bucket}:${prefix}:list`);
            break;
          }

          const listedNames = (objects ?? [])
            .map((object) => object.name)
            .filter((name) => name !== ".emptyFolderPlaceholder");
          if (listedNames.some((name) => !isSafeListedObjectName(name))) {
            failures.push(`${bucket}:${prefix}:unsafe-object-name`);
            break;
          }

          const paths = listedNames.map((name) => `${prefix}${name}`);
          if (paths.length === 0) break;

          // A successfully removed path must never be returned again. Treat a
          // repeated result as lack of progress instead of looping forever.
          if (paths.some((path) => removedPaths.has(path))) {
            failures.push(`${bucket}:${prefix}:no-progress`);
            break;
          }

          const { error: removeError } = await svc.storage
            .from(bucket)
            .remove(paths);
          if (removeError) {
            failures.push(`${bucket}:${prefix}:remove`);
            break;
          }

          for (const path of paths) removedPaths.add(path);
          removedBatchCount += 1;
        }
      }
    } catch (storageError) {
      console.warn(
        `[account-delete] storage cleanup failed for ${bucket}:`,
        storageError,
      );
      failures.push(`${bucket}:unexpected`);
    }
  }
  return failures;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if (!auth || !auth.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = auth.user.id;
  const rl = createRateLimiter({
    namespace: "account-delete",
    limit: 3,
    windowSec: 3600,
  });
  if (!(await rl.check(`user:${userId}`)).success) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Type "DELETE MY ACCOUNT" exactly to confirm permanent deletion.',
      },
      { status: 400 },
    );
  }

  const svc = createServiceRoleClient();

  // 1) Deletion audit trail BEFORE any destructive step.
  //    Note: this legacy table FK-cascades on user deletion, so it records the
  //    request window only; durable ops logging lives in server logs/Sentry.
  try {
    const { data: profile } = await svc
      .from("profiles")
      .select("id, account_type")
      .eq("id", userId)
      .maybeSingle();
    if (profile) {
      const { error: auditError } = await svc
        .from("account_activity_log")
        .insert({
          user_id: userId,
          profile_id: profile.id,
          account_type: String(
            (profile as { account_type?: string }).account_type ?? "general",
          ),
          action_type: "account_deletion_requested",
          action_details: { source: "self_service_gdpr" },
        });
      if (auditError)
        console.warn("[account-delete] audit row failed:", auditError.message);
    }
  } catch (auditError) {
    console.warn("[account-delete] audit row skipped:", auditError);
  }

  // 2) Scrub PII that would otherwise outlive the auth user.
  for (const target of PII_SURVIVOR_TABLES) {
    try {
      const { error } = await svc
        .from(target.table)
        .update(target.scrub)
        .eq(target.matchColumn, userId);
      if (error) {
        console.error(
          `[account-delete] PII scrub failed on ${target.table}:`,
          error.message,
        );
        return NextResponse.json(
          {
            error:
              "Deletion preparation failed. Your account remains active; please try again.",
          },
          { status: 503 },
        );
      }
    } catch (scrubError) {
      console.error(
        `[account-delete] PII scrub threw on ${target.table}:`,
        scrubError,
      );
      return NextResponse.json(
        {
          error:
            "Deletion preparation failed. Your account remains active; please try again.",
        },
        { status: 503 },
      );
    }
  }

  // 3) Remove user-owned storage objects.
  const storageFailures = await removeStorageForUser(svc, userId);
  if (storageFailures.length > 0) {
    console.error(
      "[account-delete] storage cleanup incomplete:",
      storageFailures,
    );
    return NextResponse.json(
      {
        error:
          "Stored files could not be removed. Your account remains active; please try again.",
      },
      { status: 503 },
    );
  }

  // 4) Delete the auth user (cascades to FK-linked rows incl. profiles).
  const { error: deleteError } = await svc.auth.admin.deleteUser(userId, false);
  if (deleteError) {
    console.error("[account-delete] auth user deletion failed:", deleteError);
    return NextResponse.json(
      {
        error:
          "Deletion could not be completed. Your account remains active; cleanup may be retried.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, message: "Account deleted." },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
