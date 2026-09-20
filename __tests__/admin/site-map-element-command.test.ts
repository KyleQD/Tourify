import { describe, expect, it } from "vitest";

import {
  MAX_SITE_MAP_ELEMENTS_PER_SYNC,
  buildSiteMapElementInsert,
  buildSiteMapElementUpdate,
  crossMapElementIds,
  siteMapElementBatchCommandSchema,
  siteMapElementCreateSchema,
  siteMapElementUpdateSchema,
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
});
