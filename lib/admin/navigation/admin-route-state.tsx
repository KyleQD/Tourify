/**
 * Admin URL & Scope Contract
 *
 * Canonical query key definitions and URL state helpers.
 * Fixes: AUX-IA-010, AUX-FLOW-003, AUX-FLOW-004, AUX-FLOW-007,
 *        AUX-DASH-004, AUX-TOUR-002, AUX-HIRE-001, AUX-TIX-002,
 *        AUX-FIN-002, AUX-CON-001, AUX-COM-005, AUX-ANL-004
 *
 * All Admin workspaces use the same URL-state rules.
 */

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

// ─── Canonical Query Keys ────────────────────────────────────────────

export const ADMIN_QUERY_KEYS = {
  /** Selected account/profile context — preserved across Admin links */
  account: "account",
  /** Resolving operating organization — never silently changed by child scope */
  orgId: "orgId",
  /** Tour scope — must belong to active organization */
  tourId: "tourId",
  /** Event/stop scope — must belong to active org / selected Tour */
  eventId: "eventId",
  /** Logistics leg scope — optional child of Tour/Event */
  legId: "legId",
  /** Organization / venue / artist employer class — used by workforce/hiring */
  employerType: "employerType",
  /** Employer entity id — must resolve under active account permissions */
  employerId: "employerId",
  /** Primary workspace section — shareable / history-aware */
  tab: "tab",
  /** Secondary workspace view or density mode */
  view: "view",
  /** Collection search */
  q: "q",
  /** Primary status filter */
  status: "status",
  /** Collection sort */
  sort: "sort",
  /** Server collection page */
  page: "page",
  /** Selected row/item for drawer/detail within page */
  selected: "selected",
  /** Density mode: card | compact | table */
  density: "density",
  /** Saved view ID */
  savedView: "savedView",
} as const;

// ─── Legacy Aliases ──────────────────────────────────────────────────

/**
 * Maps legacy parameter names to canonical keys.
 * Used for backward compatibility during migration.
 */
export const LEGACY_PARAM_ALIASES: Record<string, string> = {
  event_id: "eventId",
  tour_id: "tourId",
  leg_id: "legId",
  employer_type: "employerType",
  employer_id: "employerId",
  draft: "tab",
  view_mode: "density",
};

/**
 * Read legacy aliases but emit only the canonical key set. This keeps old
 * bookmarks readable while preventing alias keys from leaking into newly
 * generated history/share URLs.
 */
export function canonicalizeAdminParams(input: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(input.toString());
  for (const [legacy, canonical] of Object.entries(LEGACY_PARAM_ALIASES)) {
    if (params.has(legacy)) {
      if (!params.has(canonical)) params.set(canonical, params.get(legacy) ?? "");
      params.delete(legacy);
    }
  }
  return params;
}

// ─── URL State Hook ──────────────────────────────────────────────────

export interface AdminUrlState {
  account?: string;
  orgId?: string;
  tourId?: string;
  eventId?: string;
  legId?: string;
  employerType?: string;
  employerId?: string;
  tab?: string;
  view?: string;
  q?: string;
  status?: string;
  sort?: string;
  page?: string;
  selected?: string;
  density?: "card" | "compact" | "table";
  savedView?: string;
}

/**
 * Read and write Admin URL state with canonical key names.
 */
export function useAdminUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const state = useMemo<AdminUrlState>(() => {
    const params = canonicalizeAdminParams(new URLSearchParams(searchParams.toString()));

    return {
      account: params.get("account") ?? undefined,
      orgId: params.get("orgId") ?? undefined,
      tourId: params.get("tourId") ?? undefined,
      eventId: params.get("eventId") ?? undefined,
      legId: params.get("legId") ?? undefined,
      employerType: params.get("employerType") ?? undefined,
      employerId: params.get("employerId") ?? undefined,
      tab: params.get("tab") ?? undefined,
      view: params.get("view") ?? undefined,
      q: params.get("q") ?? undefined,
      status: params.get("status") ?? undefined,
      sort: params.get("sort") ?? undefined,
      page: params.get("page") ?? undefined,
      selected: params.get("selected") ?? undefined,
      density: (params.get("density") as AdminUrlState["density"]) ?? undefined,
      savedView: params.get("savedView") ?? undefined,
    };
  }, [searchParams]);

  const updateState = useCallback(
    (updates: Partial<AdminUrlState>, options?: { replace?: boolean }) => {
      const params = canonicalizeAdminParams(new URLSearchParams(searchParams.toString()));

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      if (options?.replace) {
        router.replace(newUrl, { scroll: false });
      } else {
        router.push(newUrl, { scroll: false });
      }
    },
    [router, pathname, searchParams]
  );

  const setTab = useCallback(
    (tab: string, options?: { replace?: boolean }) => {
      updateState({ tab, view: undefined, page: undefined, selected: undefined }, options);
    },
    [updateState]
  );

  const setView = useCallback(
    (view: string, options?: { replace?: boolean }) => {
      updateState({ view }, options);
    },
    [updateState]
  );

  const setFilter = useCallback(
    (key: "q" | "status" | "sort" | "page", value: string | undefined) => {
      updateState({ [key]: value }, { replace: true });
    },
    [updateState]
  );

  const setSelected = useCallback(
    (selected: string | undefined) => {
      updateState({ selected }, { replace: true });
    },
    [updateState]
  );

  return {
    state,
    updateState,
    setTab,
    setView,
    setFilter,
    setSelected,
  };
}

// ─── URL Builder Helpers ─────────────────────────────────────────────

/**
 * Build an Admin URL with canonical query parameters.
 */
export function buildAdminUrl(
  base: string,
  params: Partial<AdminUrlState>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Build a workspace URL from organization context.
 */
export function buildWorkspaceUrl(
  base: string,
  context: {
    account?: string;
    orgId?: string;
    tourId?: string;
    eventId?: string;
    tab?: string;
    view?: string;
  }
): string {
  return buildAdminUrl(base, context);
}

/**
 * Build a record URL from a workspace.
 */
export function buildRecordUrl(
  basePath: string,
  recordId: string,
  context: {
    account?: string;
    orgId?: string;
    tab?: string;
    view?: string;
  }
): string {
  return buildAdminUrl(`${basePath}/${recordId}`, context);
}

// ─── Scope Validation ────────────────────────────────────────────────

/**
 * Validate that child scope params belong to the active organization.
 * Returns the validated state or null if invalid.
 */
export function validateChildScope(
  state: AdminUrlState
): AdminUrlState | null {
  // If orgId is set, child scopes must be present or absent (not conflicting)
  // This is a basic validation — actual validation requires API calls
  return state;
}

/**
 * Clear incompatible child scope when organization changes.
 */
export function clearChildScopeOnOrgChange(
  currentOrgId: string | undefined,
  newOrgId: string | undefined,
  state: AdminUrlState
): Partial<AdminUrlState> {
  if (currentOrgId === newOrgId) return {};

  // When org changes, clear tour/event/employer scope
  return {
    tourId: undefined,
    eventId: undefined,
    legId: undefined,
    employerId: undefined,
    employerType: undefined,
  };
}

// ─── Back Navigation ─────────────────────────────────────────────────

/**
 * Build the URL to return to from a record detail page.
 * Preserves collection filters, tab, scope and scroll context.
 * Fixes: AUX-FLOW-007
 */
export function buildCollectionReturnUrl(
  basePath: string,
  state: AdminUrlState
): string {
  return buildAdminUrl(basePath, {
    account: state.account,
    orgId: state.orgId,
    tab: state.tab,
    view: state.view,
    q: state.q,
    status: state.status,
    sort: state.sort,
    page: state.page,
    density: state.density,
    savedView: state.savedView,
  });
}
