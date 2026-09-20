import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import ArtistMusicMarketplaceLayout from "@/app/artist/music/marketplace/layout";
import ArtistMusicIntelligenceLayout from "@/app/artist/music/intelligence/layout";
import CooperativeLayout from "@/app/cooperative/layout";
import CreatorCommonsLayout from "@/app/creator-commons/layout";
import FederationLayout from "@/app/federation/layout";
import InteropConventionLayout from "@/app/interop-convention/layout";
import PublicInfrastructureLayout from "@/app/public-infrastructure/layout";
import RightsIntelligenceLayout from "@/app/rights-intelligence/layout";
import TreatyOperationsLayout from "@/app/treaty-operations/layout";

describe("RELEASE-008 launch-disabled page and navigation consumers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies the artist music marketplace route family before rendering children", () => {
    expect(() =>
      ArtistMusicMarketplaceLayout({ children: "unreachable" }),
    ).toThrow("not-found");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("keeps artist music marketplace navigation conditional on canonical-backed flags", () => {
    const source = readFileSync(
      join(process.cwd(), "app/artist/music/page.tsx"),
      "utf8",
    );
    const flagRequest = source.indexOf("/api/music-marketplace/flags");
    const discoverabilityAssignment = source.indexOf(
      "setMarketplaceDiscoverable(Boolean(body?.data?.discoverable))",
    );
    const conditionalNavigation = source.indexOf(
      "{marketplaceDiscoverable ? (",
    );
    const destination = source.indexOf(
      'router.push("/artist/music/marketplace")',
    );

    expect(flagRequest).toBeGreaterThan(-1);
    expect(discoverabilityAssignment).toBeGreaterThan(flagRequest);
    expect(conditionalNavigation).toBeGreaterThan(discoverabilityAssignment);
    expect(destination).toBeGreaterThan(conditionalNavigation);
  });

  it("denies the enterprise rights-intelligence root before rendering children", () => {
    expect(() => RightsIntelligenceLayout({ children: "unreachable" })).toThrow(
      "not-found",
    );
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("denies the artist rights-intelligence root before rendering children", () => {
    expect(() =>
      ArtistMusicIntelligenceLayout({ children: "unreachable" }),
    ).toThrow("not-found");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("denies the creator digital commons route family before rendering children", () => {
    expect(() => CreatorCommonsLayout({ children: "unreachable" })).toThrow(
      "not-found",
    );
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("keeps creator digital commons API discovery behind the denied page boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "app/creator-commons/page.tsx"),
      "utf8",
    );
    const discoveryRoutes = [
      "/api/creator-digital-commons/stewards",
      "/api/creator-digital-commons/participation",
      "/api/creator-digital-commons/assets",
      "/api/creator-digital-commons/protocols",
      "/api/creator-digital-commons/registry",
      "/api/creator-digital-commons/transition",
      "/api/creator-digital-commons/gated",
    ];

    for (const route of discoveryRoutes) expect(source).toContain(route);
  });

  it("denies the creator federation route family before rendering children", () => {
    expect(() => FederationLayout({ children: "unreachable" })).toThrow(
      "not-found",
    );
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("keeps creator federation API discovery behind the denied page boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "app/federation/page.tsx"),
      "utf8",
    );
    const discoveryRoutes = [
      "/api/creator-federation/entities",
      "/api/creator-federation/membership",
      "/api/creator-federation/collective",
    ];

    for (const route of discoveryRoutes) expect(source).toContain(route);
  });

  it("denies the creator cooperative route family before rendering children", () => {
    expect(() => CooperativeLayout({ children: "unreachable" })).toThrow(
      "not-found",
    );
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("keeps creator cooperative API discovery behind the denied page boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "app/cooperative/page.tsx"),
      "utf8",
    );
    const discoveryRoutes = [
      "/api/creator-cooperative/entities",
      "/api/creator-cooperative/membership",
      "/api/creator-cooperative/policy",
      "/api/creator-cooperative/collective",
    ];

    for (const route of discoveryRoutes) expect(source).toContain(route);
  });

  it("denies the creator interoperability convention route family before rendering children", () => {
    expect(() => InteropConventionLayout({ children: "unreachable" })).toThrow(
      "not-found",
    );
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("keeps creator interoperability convention API discovery behind the denied page boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "app/interop-convention/page.tsx"),
      "utf8",
    );
    const discoveryRoutes = [
      "/api/creator-interoperability-convention/networks",
      "/api/creator-interoperability-convention/approval-packages",
      "/api/creator-interoperability-convention/recognition",
      "/api/creator-interoperability-convention/gated",
    ];

    for (const route of discoveryRoutes) expect(source).toContain(route);
  });

  it("denies the creator public infrastructure route family before rendering children", () => {
    expect(() =>
      PublicInfrastructureLayout({ children: "unreachable" }),
    ).toThrow("not-found");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("keeps creator public infrastructure API discovery behind the denied page boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "app/public-infrastructure/page.tsx"),
      "utf8",
    );
    const discoveryRoutes = [
      "/api/creator-public-infrastructure/entities",
      "/api/creator-public-infrastructure/identifiers",
      "/api/creator-public-infrastructure/participation",
      "/api/creator-public-infrastructure/gated",
    ];

    for (const route of discoveryRoutes) expect(source).toContain(route);
  });

  it("denies the creator multilateral treaty operations route family before rendering children", () => {
    expect(() =>
      TreatyOperationsLayout({ children: "unreachable" }),
    ).toThrow("not-found");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("keeps creator multilateral treaty operations API discovery behind the denied page boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "app/treaty-operations/page.tsx"),
      "utf8",
    );
    const discoveryRoutes = [
      "/api/creator-multilateral-treaty-operations/status",
      "/api/creator-multilateral-treaty-operations/readiness-packages",
      "/api/creator-multilateral-treaty-operations/review-cycles",
      "/api/creator-multilateral-treaty-operations/gated",
    ];

    for (const route of discoveryRoutes) expect(source).toContain(route);
  });
});
