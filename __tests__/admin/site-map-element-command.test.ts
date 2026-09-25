import { describe, expect, it } from "vitest";

import {
  MAX_SITE_MAP_ELEMENTS_PER_SYNC,
  buildSiteMapElementInsert,
  buildSiteMapElementUpdate,
  crossMapElementIds,
  isMissingSiteMapElementSyncFunction,
  siteMapElementBatchCommandSchema,
  siteMapElementCreateSchema,
  siteMapElementUpdateSchema,
  syncSiteMapElementsWithoutRpc,
} from "@/lib/admin/site-map-elements";

const elementId = "00000000-0000-4000-8000-000000000001";
const siteMapId = "00000000-0000-4000-8000-00000000000a";

function validElement(overrides: Record<string, unknown> = {}) {
  return {
    id: elementId,
    elementType: "building",
    name: "Main stage",
    x: 10.4,
    y: 20.6,
    width: 100,
    height: 80,
    color: "#123abc",
    strokeColor: "#abcdef",
    properties: { layerId: "operations" },
    ...overrides,
  };
}

describe("site-map element command boundary", () => {
  it("normalizes a validated canvas element to database-safe values", () => {
    const input = siteMapElementCreateSchema.parse(
      validElement({ elementType: "stage_fixture", opacity: 0.755 }),
    );
    expect(buildSiteMapElementInsert({ siteMapId, input })).toMatchObject({
      id: elementId,
      site_map_id: siteMapId,
      element_type: "custom",
      x: 10,
      y: 21,
      opacity: 0.76,
      color: "#123abc",
      properties: { layerId: "operations" },
    });
  });

  it.each([
    validElement({ siteMapId }),
    validElement({ site_map_id: siteMapId }),
    validElement({ createdBy: elementId }),
    validElement({ color: "rgba(0,0,0,.5)" }),
    validElement({ x: -1 }),
    validElement({ opacity: 2 }),
    { ...validElement(), elementType: undefined, type: undefined },
  ])("rejects forged or database-invalid create input %#", (input) => {
    expect(siteMapElementCreateSchema.safeParse(input).success).toBe(false);
  });

  it("requires an explicit upsert command and unique ids for batch sync", () => {
    expect(
      siteMapElementBatchCommandSchema.safeParse({
        elements: [validElement(), validElement()],
        upsert: true,
        sync: true,
      }).success,
    ).toBe(false);
    expect(
      siteMapElementBatchCommandSchema.safeParse({
        elements: [validElement()],
        sync: true,
      }).success,
    ).toBe(false);
  });

  it("bounds the atomic autosave payload", () => {
    const elements = Array.from(
      { length: MAX_SITE_MAP_ELEMENTS_PER_SYNC + 1 },
      (_, index) =>
        validElement({
          id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        }),
    );
    expect(
      siteMapElementBatchCommandSchema.safeParse({
        elements,
        upsert: true,
        sync: true,
      }).success,
    ).toBe(false);
  });

  it("merges interaction flags without erasing existing properties", () => {
    const input = siteMapElementUpdateSchema.parse({ visible: false, x: 12.8 });
    expect(
      buildSiteMapElementUpdate(input, {
        layerId: "existing-layer",
        locked: true,
      }),
    ).toEqual({
      x: 13,
      properties: {
        layerId: "existing-layer",
        locked: true,
        visible: false,
      },
    });
  });

  it("rejects empty and identity-changing updates", () => {
    expect(siteMapElementUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      siteMapElementUpdateSchema.safeParse({ id: elementId }).success,
    ).toBe(false);
    expect(
      siteMapElementUpdateSchema.safeParse({ siteMapId, x: 20 }).success,
    ).toBe(false);
  });

  it("detects ids that already belong to another map", () => {
    expect(
      crossMapElementIds(
        [
          { id: "same", site_map_id: siteMapId },
          { id: "other", site_map_id: "00000000-0000-4000-8000-00000000000b" },
        ],
        siteMapId,
      ),
    ).toEqual(["other"]);
  });

  it("recognizes the missing atomic sync function without masking other failures", () => {
    expect(isMissingSiteMapElementSyncFunction({
      code: "PGRST202",
      message: "Could not find the function public.sync_site_map_elements in the schema cache",
    })).toBe(true);
    expect(isMissingSiteMapElementSyncFunction({
      code: "42501",
      message: "Site-map edit access denied",
    })).toBe(false);
  });

  it("saves and prunes a canvas through the guarded compatibility path", async () => {
    const operations: string[] = [];
    const responses = [
      { data: [], error: null },
      { data: null, error: null },
      { data: [{ id: elementId }, { id: "00000000-0000-4000-8000-000000000099" }], error: null },
      { data: null, error: null },
      { data: [{ ...validElement(), site_map_id: siteMapId }], error: null },
    ];
    const dataClient = {
      from: () => {
        const query = {
          select: () => { operations.push("select"); return query; },
          insert: () => { operations.push("insert"); return query; },
          update: () => { operations.push("update"); return query; },
          delete: () => { operations.push("delete"); return query; },
          eq: () => query,
          in: () => query,
          order: () => query,
          maybeSingle: async () => responses.shift(),
          then: (
            resolve: (value: unknown) => unknown,
            reject: (reason: unknown) => unknown,
          ) => Promise.resolve(responses.shift()).then(resolve, reject),
        };
        return query;
      },
    };

    const row = buildSiteMapElementInsert({
      siteMapId,
      input: siteMapElementCreateSchema.parse(validElement()),
    }) as Record<string, unknown>;
    const result = await syncSiteMapElementsWithoutRpc({
      dataClient,
      siteMapId,
      rows: [row],
      deleteMissing: true,
    });

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(operations).toContain("insert");
    expect(operations).toContain("delete");
  });

  it("refuses compatibility writes when an element id belongs to another map", async () => {
    let wrote = false;
    const dataClient = {
      from: () => {
        const query = {
          select: () => query,
          in: () => query,
          insert: () => { wrote = true; return query; },
          then: (
            resolve: (value: unknown) => unknown,
            reject: (reason: unknown) => unknown,
          ) => Promise.resolve({
            data: [{ id: elementId, site_map_id: "00000000-0000-4000-8000-00000000000b" }],
            error: null,
          }).then(resolve, reject),
        };
        return query;
      },
    };
    const row = buildSiteMapElementInsert({
      siteMapId,
      input: siteMapElementCreateSchema.parse(validElement()),
    }) as Record<string, unknown>;

    const result = await syncSiteMapElementsWithoutRpc({
      dataClient,
      siteMapId,
      rows: [row],
      deleteMissing: false,
    });

    expect(result.error?.code).toBe("23505");
    expect(wrote).toBe(false);
  });
});
