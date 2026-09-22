import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as runExternalEventSync } from "@/app/api/cron/events/sync/route";
import { GET as getPollAnalytics } from "@/app/api/polls/analytics/route";
import { POST as receiveInstitutionalWebhook } from "@/app/api/institutional/partners/webhooks/[provider]/route";
import { POST as receiveLicensingWebhook } from "@/app/api/licensing/partners/webhooks/[provider]/route";
import { POST as receiveRightsAdminWebhook } from "@/app/api/rights-admin/partners/webhooks/[provider]/route";
import { isLaunchCapabilityAvailable } from "@/lib/config/launch-capabilities";
import {
  DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS,
  resolveMusicRightsIntelligenceFlags,
} from "@/lib/music/rights-intelligence/music-rights-intelligence-flags";
import {
  DISABLED_MUSIC_MARKETPLACE_FLAGS,
  resolveMusicMarketplaceFlags,
} from "@/lib/music/marketplace/music-marketplace-flags";
import {
  DISABLED_CREATOR_COOPERATIVE_FLAGS,
  resolveCreatorCooperativeFlags,
} from "@/lib/music/creator-cooperative/creator-cooperative-flags";
import {
  DISABLED_CREATOR_DIGITAL_COMMONS_FLAGS,
  resolveCreatorDigitalCommonsFlags,
} from "@/lib/music/creator-digital-commons/creator-digital-commons-flags";
import {
  DISABLED_CREATOR_FEDERATION_FLAGS,
  resolveCreatorFederationFlags,
} from "@/lib/music/creator-federation/creator-federation-flags";
import {
  DISABLED_CREATOR_INTEROP_CONVENTION_FLAGS,
  resolveCreatorInteropConventionFlags,
} from "@/lib/music/creator-interoperability-convention/creator-interop-convention-flags";
import {
  DISABLED_CREATOR_INTEROP_INSTITUTION_FLAGS,
  resolveCreatorInteropInstitutionFlags,
} from "@/lib/music/creator-interoperability-institution/creator-interop-institution-flags";
import {
  DISABLED_CREATOR_INTEROP_ORG_FLAGS,
  resolveCreatorInteropOrgFlags,
} from "@/lib/music/creator-interoperability-organization/creator-interop-org-flags";
import {
  DISABLED_CREATOR_PROTOCOL_CONSTITUTION_FLAGS,
  resolveCreatorProtocolConstitutionFlags,
} from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags";
import {
  DISABLED_CREATOR_PUBLIC_INFRASTRUCTURE_FLAGS,
  resolveCreatorPublicInfrastructureFlags,
} from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags";
import {
  DISABLED_CREATOR_TREATY_OPS_FLAGS,
  resolveCreatorTreatyOpsFlags,
} from "@/lib/music/creator-multilateral-treaty-operations/creator-treaty-ops-flags";
import {
  DISABLED_CREATOR_TREATY_LEGACY_FLAGS,
  resolveCreatorTreatyLegacyFlags,
} from "@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags";
import {
  DISABLED_CREATOR_TREATY_RENEWAL_FLAGS,
  resolveCreatorTreatyRenewalFlags,
} from "@/lib/music/creator-treaty-system-renewal/creator-treaty-renewal-flags";
import { runCreatorOutboxWorker } from "@/lib/music/creator-outbox-runner";

const originalCronSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

describe("RELEASE-008 server launch-capability consumers", () => {
  it("denies direct poll analytics access before authentication or data access", async () => {
    const response = await getPollAnalytics(
      new NextRequest("http://localhost/api/polls/analytics"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FEATURE_UNAVAILABLE", feature: "polls" },
    });
  });

  it("denies an authorized external-provider cron before job or provider access", async () => {
    process.env.CRON_SECRET = "release-008-test-secret";
    const response = await runExternalEventSync(
      new NextRequest("http://localhost/api/cron/events/sync", {
        method: "POST",
        headers: { authorization: "Bearer release-008-test-secret" },
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "FEATURE_UNAVAILABLE",
        capability: "external_event_providers",
      },
    });
  });

  it("guards the deferred finance worker before credentials or queue access", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/music-marketplace-outbox-worker.ts"),
      "utf8",
    );
    const capabilityGuard = source.indexOf(
      'isLaunchCapabilityAvailable("music_finance_offerings")',
    );
    const credentialRead = source.indexOf(
      "process.env.SUPABASE_SERVICE_ROLE_KEY",
    );
    const queueRead = source.indexOf(
      '.from("music_marketplace_outbox_events")',
    );

    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(credentialRead).toBeGreaterThan(capabilityGuard);
    expect(queueRead).toBeGreaterThan(capabilityGuard);
  });

  it("keeps artist music marketplace flags out of the database while finance offerings are launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error("music marketplace database access must stay closed");
        },
      },
    );

    await expect(resolveMusicMarketplaceFlags(databaseAccess)).resolves.toEqual(
      DISABLED_MUSIC_MARKETPLACE_FLAGS,
    );
  });

  it("denies the institutional provider webhook before reading its request or secrets", async () => {
    const request = new NextRequest(
      "http://localhost/api/institutional/partners/webhooks/example",
      {
        method: "POST",
        body: JSON.stringify({ id: "evt-1", type: "fund.nav.finalized" }),
      },
    );
    const response = await receiveInstitutionalWebhook(request, {
      params: Promise.resolve({ provider: "example" }),
    });

    expect(response.status).toBe(503);
    expect(request.bodyUsed).toBe(false);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FEATURE_UNAVAILABLE", feature: "advanced_webhooks" },
    });
  });

  it("guards the institutional finance worker before credentials or queue access", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/music-institutional-outbox-worker.ts"),
      "utf8",
    );
    const capabilityGuard = source.indexOf(
      'isLaunchCapabilityAvailable("music_finance_offerings")',
    );
    const credentialRead = source.indexOf(
      "process.env.SUPABASE_SERVICE_ROLE_KEY",
    );
    const queueRead = source.indexOf(
      '.from("music_institutional_outbox_events")',
    );

    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(credentialRead).toBeGreaterThan(capabilityGuard);
    expect(queueRead).toBeGreaterThan(capabilityGuard);
  });

  it("denies the licensing provider webhook before reading its request or secrets", async () => {
    const request = new NextRequest(
      "http://localhost/api/licensing/partners/webhooks/example",
      {
        method: "POST",
        body: JSON.stringify({ id: "evt-2", type: "invoice.paid" }),
      },
    );
    const response = await receiveLicensingWebhook(request, {
      params: Promise.resolve({ provider: "example" }),
    });

    expect(response.status).toBe(503);
    expect(request.bodyUsed).toBe(false);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FEATURE_UNAVAILABLE", feature: "advanced_webhooks" },
    });
  });

  it("guards the licensing worker before credentials or queue access", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/music-licensing-outbox-worker.ts"),
      "utf8",
    );
    const capabilityGuard = source.indexOf(
      'isLaunchCapabilityAvailable("advanced_music_webhooks")',
    );
    const credentialRead = source.indexOf(
      "process.env.SUPABASE_SERVICE_ROLE_KEY",
    );
    const queueRead = source.indexOf('.from("music_licensing_outbox")');

    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(credentialRead).toBeGreaterThan(capabilityGuard);
    expect(queueRead).toBeGreaterThan(capabilityGuard);
  });

  it("denies the rights-admin provider webhook before reading its request or secrets", async () => {
    const request = new NextRequest(
      "http://localhost/api/rights-admin/partners/webhooks/example",
      {
        method: "POST",
        body: JSON.stringify({ id: "evt-3", type: "registration.status" }),
      },
    );
    const response = await receiveRightsAdminWebhook(request, {
      params: Promise.resolve({ provider: "example" }),
    });

    expect(response.status).toBe(503);
    expect(request.bodyUsed).toBe(false);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FEATURE_UNAVAILABLE", feature: "advanced_webhooks" },
    });
  });

  it("guards the rights-admin worker before credentials or queue access", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/music-rights-admin-outbox-worker.ts"),
      "utf8",
    );
    const capabilityGuard = source.indexOf(
      'isLaunchCapabilityAvailable("advanced_music_webhooks")',
    );
    const credentialRead = source.indexOf(
      "process.env.SUPABASE_SERVICE_ROLE_KEY",
    );
    const queueRead = source.indexOf('.from("music_rights_admin_outbox")');

    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(credentialRead).toBeGreaterThan(capabilityGuard);
    expect(queueRead).toBeGreaterThan(capabilityGuard);
  });

  it("keeps rights-intelligence flag resolution out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "rights-intelligence database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveMusicRightsIntelligenceFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS);
  });

  it("guards the rights-intelligence worker before credentials or queue access", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/music-rights-intelligence-outbox-worker.ts"),
      "utf8",
    );
    const capabilityGuard = source.indexOf(
      'isLaunchCapabilityAvailable("music_rights_intelligence")',
    );
    const credentialRead = source.indexOf(
      "process.env.SUPABASE_SERVICE_ROLE_KEY",
    );
    const queueRead = source.indexOf('.from("music_intelligence_outbox")');

    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(credentialRead).toBeGreaterThan(capabilityGuard);
    expect(queueRead).toBeGreaterThan(capabilityGuard);
  });

  it("keeps creator-cooperative flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-cooperative database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorCooperativeFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_COOPERATIVE_FLAGS);
  });

  it("guards the creator-cooperative worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-cooperative",
        table: "creator_cooperative_outbox",
        eventField: "event_type",
        launchCapability: "creator_cooperative",
      }),
    ).rejects.toThrow("Launch capability unavailable: creator_cooperative");

    const source = readFileSync(
      join(process.cwd(), "scripts/music-creator-cooperative-outbox-worker.ts"),
      "utf8",
    );
    expect(source).toContain('launchCapability: "creator_cooperative"');
  });

  it("keeps creator-digital-commons flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-digital-commons database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorDigitalCommonsFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_DIGITAL_COMMONS_FLAGS);
  });

  it("guards the creator-digital-commons worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-digital-commons",
        table: "creator_commons_outbox",
        eventField: "topic",
        launchCapability: "creator_digital_commons",
      }),
    ).rejects.toThrow("Launch capability unavailable: creator_digital_commons");

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-digital-commons-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain('launchCapability: "creator_digital_commons"');
  });

  it("keeps creator-federation flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-federation database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorFederationFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_FEDERATION_FLAGS);
  });

  it("guards the creator-federation worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-federation",
        table: "creator_federation_outbox_events",
        eventField: "event_type",
        launchCapability: "creator_federation",
      }),
    ).rejects.toThrow("Launch capability unavailable: creator_federation");

    const source = readFileSync(
      join(process.cwd(), "scripts/music-creator-federation-outbox-worker.ts"),
      "utf8",
    );
    expect(source).toContain('launchCapability: "creator_federation"');
  });

  it("keeps creator-interoperability-convention flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-interoperability-convention database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorInteropConventionFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_INTEROP_CONVENTION_FLAGS);
  });

  it("guards the creator-interoperability-convention worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-interoperability-convention",
        table: "creator_interop_outbox",
        eventField: "event_type",
        launchCapability: "creator_interoperability_convention",
      }),
    ).rejects.toThrow(
      "Launch capability unavailable: creator_interoperability_convention",
    );

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-interoperability-convention-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      'launchCapability: "creator_interoperability_convention"',
    );
  });

  it("keeps creator-interoperability-institution flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-interoperability-institution database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorInteropInstitutionFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_INTEROP_INSTITUTION_FLAGS);
  });

  it("guards the creator-interoperability-institution worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-interoperability-institution",
        table: "creator_interop_institution_outbox",
        eventField: "event_type",
        launchCapability: "creator_interoperability_institution",
      }),
    ).rejects.toThrow(
      "Launch capability unavailable: creator_interoperability_institution",
    );

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-interoperability-institution-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      'launchCapability: "creator_interoperability_institution"',
    );
  });

  it("keeps creator-interoperability-organization flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-interoperability-organization database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorInteropOrgFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_INTEROP_ORG_FLAGS);
  });

  it("guards the creator-interoperability-organization worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-interoperability-organization",
        table: "creator_interop_org_outbox",
        eventField: "event_type",
        launchCapability: "creator_interoperability_organization",
      }),
    ).rejects.toThrow(
      "Launch capability unavailable: creator_interoperability_organization",
    );

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-interoperability-organization-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      'launchCapability: "creator_interoperability_organization"',
    );
  });

  it("keeps creator-protocol-constitution flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-protocol-constitution database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorProtocolConstitutionFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_PROTOCOL_CONSTITUTION_FLAGS);
  });

  it("guards the creator-protocol-constitution worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-protocol-constitution",
        table: "creator_protocol_outbox",
        eventField: "event_type",
        launchCapability: "creator_protocol_constitution",
      }),
    ).rejects.toThrow(
      "Launch capability unavailable: creator_protocol_constitution",
    );

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-protocol-constitution-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      'launchCapability: "creator_protocol_constitution"',
    );
  });

  it("keeps creator-public-infrastructure flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-public-infrastructure database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorPublicInfrastructureFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_PUBLIC_INFRASTRUCTURE_FLAGS);
  });

  it("guards the creator-public-infrastructure worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-public-infrastructure",
        table: "creator_public_outbox",
        eventField: "event_type",
        attemptsField: "attempt_count",
        launchCapability: "creator_public_infrastructure",
      }),
    ).rejects.toThrow(
      "Launch capability unavailable: creator_public_infrastructure",
    );

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-public-infrastructure-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      'launchCapability: "creator_public_infrastructure"',
    );
  });

  it("keeps creator-multilateral-treaty-operations flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-multilateral-treaty-operations database access must stay closed",
          );
        },
      },
    );

    await expect(resolveCreatorTreatyOpsFlags(databaseAccess)).resolves.toEqual(
      DISABLED_CREATOR_TREATY_OPS_FLAGS,
    );
  });

  it("guards the creator-multilateral-treaty-operations worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-multilateral-treaty-operations",
        table: "creator_treaty_ops_outbox",
        eventField: "event_type",
        launchCapability: "creator_multilateral_treaty_operations",
      }),
    ).rejects.toThrow(
      "Launch capability unavailable: creator_multilateral_treaty_operations",
    );

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-multilateral-treaty-operations-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      'launchCapability: "creator_multilateral_treaty_operations"',
    );
  });

  it("keeps creator-treaty-system-legacy flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-treaty-system-legacy database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorTreatyLegacyFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_TREATY_LEGACY_FLAGS);
  });

  it("guards the creator-treaty-system-legacy worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-treaty-system-legacy",
        table: "creator_treaty_legacy_outbox",
        eventField: "event_type",
        launchCapability: "creator_treaty_system_legacy",
      }),
    ).rejects.toThrow(
      "Launch capability unavailable: creator_treaty_system_legacy",
    );

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-treaty-system-legacy-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      'launchCapability: "creator_treaty_system_legacy"',
    );
  });

  it("keeps creator-treaty-system-renewal flags out of the database while launch-disabled", async () => {
    const databaseAccess = new Proxy(
      {},
      {
        get() {
          throw new Error(
            "creator-treaty-system-renewal database access must stay closed",
          );
        },
      },
    );

    await expect(
      resolveCreatorTreatyRenewalFlags(databaseAccess),
    ).resolves.toEqual(DISABLED_CREATOR_TREATY_RENEWAL_FLAGS);
  });

  it("guards the creator-treaty-system-renewal worker before credentials or queue access", async () => {
    await expect(
      runCreatorOutboxWorker({
        workerId: "creator-treaty-system-renewal",
        table: "creator_treaty_renewal_outbox",
        eventField: "event_type",
        launchCapability: "creator_treaty_system_renewal",
      }),
    ).rejects.toThrow(
      "Launch capability unavailable: creator_treaty_system_renewal",
    );

    const source = readFileSync(
      join(
        process.cwd(),
        "scripts/music-creator-treaty-system-renewal-outbox-worker.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      'launchCapability: "creator_treaty_system_renewal"',
    );
  });

  it("guards automatic music-preview processing before trusted data, credentials, network, or queue work", () => {
    expect(isLaunchCapabilityAvailable("music_preview_processing")).toBe(false);

    const source = readFileSync(
      join(process.cwd(), "scripts/music-preview-worker.ts"),
      "utf8",
    );
    const mainStart = source.indexOf("async function main()");
    const mainBody = source.slice(
      mainStart,
      source.indexOf("\n}\n\nmain().catch", mainStart),
    );
    const capabilityGuard = mainBody.indexOf(
      'isLaunchCapabilityAvailable("music_preview_processing")',
    );
    const workerConfigRead = mainBody.indexOf(
      "process.env.MUSIC_PREVIEW_WORKER_LOOP",
    );
    const workerRun = mainBody.indexOf("await runOnce()");

    expect(mainStart).toBeGreaterThan(-1);
    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(workerConfigRead).toBeGreaterThan(capabilityGuard);
    expect(workerRun).toBeGreaterThan(capabilityGuard);
    expect(source).toContain('getEnv("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain('.from("music_preview_generation_jobs")');
    expect(source).toContain("fetch(data.signedUrl)");
  });

  it("guards music-origin processing before trusted data, credentials, network, queue, temp-file, or persistence work", () => {
    expect(isLaunchCapabilityAvailable("music_origin_processing")).toBe(false);

    const source = readFileSync(
      join(process.cwd(), "scripts/music-origin-worker.ts"),
      "utf8",
    );
    const mainStart = source.indexOf("async function main()");
    const mainBody = source.slice(
      mainStart,
      source.indexOf("\n}\n\nmain().catch", mainStart),
    );
    const capabilityGuard = mainBody.indexOf(
      'isLaunchCapabilityAvailable("music_origin_processing")',
    );
    const workerConfigRead = mainBody.indexOf(
      "process.env.MUSIC_ORIGIN_WORKER_LOOP",
    );
    const workerRun = mainBody.indexOf("await runOnce()");

    expect(mainStart).toBeGreaterThan(-1);
    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(workerConfigRead).toBeGreaterThan(capabilityGuard);
    expect(workerRun).toBeGreaterThan(capabilityGuard);
    expect(source).toContain('requiredEnv("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain('.from("music_file_fingerprints")');
    expect(source).toContain("fetch(data.signedUrl)");
    expect(source).toContain('mkdtemp(join(tmpdir(), "tourify-music-origin-")');
    expect(source).toContain('.from("music_origin_records").insert({');
  });

  it("guards music trust reconciliation before credentials, trusted data, queries, queue writes, or track updates", () => {
    expect(isLaunchCapabilityAvailable("music_origin_processing")).toBe(false);

    const source = readFileSync(
      join(process.cwd(), "scripts/music-trust-reconcile.ts"),
      "utf8",
    );
    const mainStart = source.indexOf("async function main()");
    const mainBody = source.slice(
      mainStart,
      source.indexOf("\n}\n\nmain().catch", mainStart),
    );
    const capabilityGuard = mainBody.indexOf(
      'isLaunchCapabilityAvailable("music_origin_processing")',
    );
    const trustedClient = mainBody.indexOf("createClient(");

    expect(mainStart).toBeGreaterThan(-1);
    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(trustedClient).toBeGreaterThan(capabilityGuard);
    expect(source).toContain('required("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain('.from("feature_flags")');
    expect(source).toContain('.from("artist_music")');
    expect(source).toContain('.from("music_file_fingerprints").upsert({');
    expect(source).toContain('.from("artist_music").update({');
  });

  it("guards protected-derivative processing before trusted data, credentials, queue, compute, or persistence work", () => {
    expect(isLaunchCapabilityAvailable("music_protected_derivatives")).toBe(
      false,
    );

    const source = readFileSync(
      join(process.cwd(), "scripts/music-rights-derivative-worker.ts"),
      "utf8",
    );
    const mainStart = source.indexOf("async function main()");
    const mainBody = source.slice(
      mainStart,
      source.indexOf("\n}\n\nmain().catch", mainStart),
    );
    const capabilityGuard = mainBody.indexOf(
      'isLaunchCapabilityAvailable("music_protected_derivatives")',
    );
    const workerConfigRead = mainBody.indexOf(
      "process.env.MUSIC_RIGHTS_DERIVATIVE_BATCH",
    );
    const trustedClient = mainBody.indexOf("createWorkerClient()");
    const queueClaim = mainBody.indexOf("await claimDerivatives(");

    expect(mainStart).toBeGreaterThan(-1);
    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(workerConfigRead).toBeGreaterThan(capabilityGuard);
    expect(trustedClient).toBeGreaterThan(capabilityGuard);
    expect(queueClaim).toBeGreaterThan(capabilityGuard);
    expect(source).toContain('requiredEnv("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain('.from("music_rights_derivatives")');
    expect(source).toContain('createHash("sha256")');
    expect(source).toContain("await getWatermarkAdapter()");
    expect(source).toContain("await getC2paAdapter()");
    expect(source).toContain('.from("music_rights_outbox_events").upsert({');
    expect(source).not.toMatch(/mkdtemp|createWriteStream|writeFile/);
  });

  it("guards testnet anchoring before trusted data, credentials, queue, provider, or persistence work", () => {
    expect(isLaunchCapabilityAvailable("music_testnet_anchoring")).toBe(false);

    const source = readFileSync(
      join(process.cwd(), "scripts/music-rights-anchor-worker.ts"),
      "utf8",
    );
    const mainStart = source.indexOf("async function main()");
    const mainBody = source.slice(
      mainStart,
      source.indexOf("\n}\n\nmain().catch", mainStart),
    );
    const capabilityGuard = mainBody.indexOf(
      'isLaunchCapabilityAvailable("music_testnet_anchoring")',
    );
    const workerConfigRead = mainBody.indexOf(
      "process.env.MUSIC_RIGHTS_ANCHOR_BATCH",
    );
    const trustedClient = mainBody.indexOf("createWorkerClient()");
    const queueClaim = mainBody.indexOf("await claimOutbox(");

    expect(mainStart).toBeGreaterThan(-1);
    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(workerConfigRead).toBeGreaterThan(capabilityGuard);
    expect(trustedClient).toBeGreaterThan(capabilityGuard);
    expect(queueClaim).toBeGreaterThan(capabilityGuard);
    expect(source).toContain('requiredEnv("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain('.from("music_rights_outbox_events")');
    expect(source).toContain("resolveAnchorNetwork()");
    expect(source).toContain("process.env.MUSIC_RIGHTS_SEPOLIA_RPC_URL");
    expect(source).toContain("process.env.MUSIC_RIGHTS_ANCHOR_SIGNER_KEY");
    expect(source).toContain('.from("music_rights_blockchain_anchors").upsert({');
  });

  it("guards royalty ingestion before trusted data, credentials, queue, file parsing, or persistence work", () => {
    expect(isLaunchCapabilityAvailable("music_royalty_ingestion")).toBe(false);

    const source = readFileSync(
      join(process.cwd(), "scripts/music-royalties-import-worker.ts"),
      "utf8",
    );
    const mainStart = source.indexOf("async function main()");
    const mainBody = source.slice(
      mainStart,
      source.indexOf("\n}\n\nmain().catch", mainStart),
    );
    const capabilityGuard = mainBody.indexOf(
      'isLaunchCapabilityAvailable("music_royalty_ingestion")',
    );
    const workerConfigRead = mainBody.indexOf(
      "process.env.MUSIC_ROYALTIES_IMPORT_BATCH",
    );
    const trustedClient = mainBody.indexOf("createWorkerClient()");
    const queueClaim = mainBody.indexOf("await claimBatches(");

    expect(mainStart).toBeGreaterThan(-1);
    expect(capabilityGuard).toBeGreaterThan(-1);
    expect(workerConfigRead).toBeGreaterThan(capabilityGuard);
    expect(trustedClient).toBeGreaterThan(capabilityGuard);
    expect(queueClaim).toBeGreaterThan(capabilityGuard);
    expect(source).toContain('requiredEnv("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain('.from("music_royalties_import_batches")');
    expect(source).toContain(".download(batch.storage_path)");
    expect(source).toContain("await file.text()");
    expect(source).toContain("parseGenericRoyaltyCsv({");
    expect(source).toContain('.from("music_royalties_normalized_lines").insert(');
    expect(source).toContain('.from("music_royalties_outbox_events").upsert({');
    expect(source).not.toContain('.from("music_royalties_allocations")');
  });
});
