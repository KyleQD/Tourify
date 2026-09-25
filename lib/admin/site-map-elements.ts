import { z } from "zod";

import type { Json, TablesInsert, TablesUpdate } from "@/lib/database.types";

export const MAX_SITE_MAP_ELEMENTS_PER_SYNC = 1_000;
const MAX_SITE_MAP_COORDINATE = 1_000_000;
const MAX_SITE_MAP_JSON_BYTES = 256_000;
const MAX_SITE_MAP_PATH_BYTES = 256_000;

export const SITE_MAP_ELEMENT_TYPES = [
  "path",
  "road",
  "fence",
  "tree",
  "building",
  "utility_line",
  "water_source",
  "power_station",
  "waste_disposal",
  "sign",
  "marker",
  "custom",
] as const;

const SITE_MAP_ELEMENT_TYPE_SET = new Set<string>(SITE_MAP_ELEMENT_TYPES);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const boundedJsonObjectSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (value) =>
      new TextEncoder().encode(JSON.stringify(value)).byteLength <=
      MAX_SITE_MAP_JSON_BYTES,
    `JSON properties must not exceed ${MAX_SITE_MAP_JSON_BYTES} bytes`,
  );

const coordinateSchema = z
  .number()
  .finite()
  .min(0)
  .max(MAX_SITE_MAP_COORDINATE);
const rotationSchema = z.number().finite().min(-999.99).max(999.99);
const colorSchema = z
  .string()
  .regex(HEX_COLOR, "Expected a six-digit hex color");

const elementShape = {
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  label: z.string().trim().min(1).max(255).optional(),
  elementType: z.string().trim().min(1).max(100).optional(),
  type: z.string().trim().min(1).max(100).optional(),
  x: coordinateSchema,
  y: coordinateSchema,
  width: coordinateSchema.optional(),
  height: coordinateSchema.optional(),
  rotation: rotationSchema.optional(),
  color: colorSchema.optional(),
  fill: colorSchema.optional(),
  strokeColor: colorSchema.optional(),
  stroke: colorSchema.optional(),
  strokeWidth: z.number().finite().min(0).max(100).optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  properties: boundedJsonObjectSchema.optional(),
  data: boundedJsonObjectSchema.optional(),
  pathData: z.string().max(MAX_SITE_MAP_PATH_BYTES).nullable().optional(),
  shapeData: boundedJsonObjectSchema.nullable().optional(),
  layerId: z.string().trim().min(1).max(255).nullable().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  scale: z.number().finite().positive().max(1_000).optional(),
};

function requireElementType(
  value: { elementType?: string; type?: string },
  context: z.RefinementCtx,
) {
  if (value.elementType || value.type) return;
  context.addIssue({
    code: z.ZodIssueCode.custom,
    message: "elementType or type is required",
    path: ["elementType"],
  });
}

export const siteMapElementCreateSchema = z
  .object(elementShape)
  .strict()
  .superRefine(requireElementType);

export const siteMapElementBatchCommandSchema = z
  .object({
    elements: z
      .array(siteMapElementCreateSchema)
      .max(MAX_SITE_MAP_ELEMENTS_PER_SYNC),
    upsert: z.literal(true),
    sync: z.boolean().default(false),
  })
  .strict()
  .superRefine((command, context) => {
    const ids = command.elements
      .map((element) => element.id)
      .filter((id): id is string => Boolean(id));
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length === 0) return;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Element ids must be unique within one sync",
      path: ["elements"],
    });
  });

const updateShape = {
  ...elementShape,
  id: z.never().optional(),
  x: coordinateSchema.optional(),
  y: coordinateSchema.optional(),
};

export const siteMapElementUpdateSchema = z
  .object(updateShape)
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length > 0) return;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one element field is required",
    });
  });

export const siteMapElementRouteParamsSchema = z
  .object({
    id: z.string().uuid(),
    elementId: z.string().uuid().optional(),
  })
  .strict();

export type SiteMapElementCreateInput = z.infer<
  typeof siteMapElementCreateSchema
>;
export type SiteMapElementUpdateInput = z.infer<
  typeof siteMapElementUpdateSchema
>;

function normalizeElementType(value: string | undefined) {
  return value && SITE_MAP_ELEMENT_TYPE_SET.has(value) ? value : "custom";
}

function roundInteger(value: number | undefined, fallback = 0) {
  return Math.round(value ?? fallback);
}

function roundDecimal(value: number | undefined, fallback = 0) {
  return Math.round((value ?? fallback) * 100) / 100;
}

type JsonObject = { [key: string]: Json | undefined };

function jsonObject(
  value: Record<string, unknown> | JsonObject | undefined,
): JsonObject {
  return (value ?? {}) as JsonObject;
}

function interactionProperties(
  input: Pick<
    SiteMapElementCreateInput | SiteMapElementUpdateInput,
    "properties" | "data" | "layerId" | "visible" | "locked" | "scale"
  >,
  fallback?: Json | null,
): Json {
  const fallbackObject =
    fallback && typeof fallback === "object" && !Array.isArray(fallback)
      ? fallback
      : {};
  const base = input.properties ?? input.data ?? fallbackObject;
  return {
    ...jsonObject(base),
    ...(input.layerId !== undefined ? { layerId: input.layerId } : {}),
    ...(input.visible !== undefined ? { visible: input.visible } : {}),
    ...(input.locked !== undefined ? { locked: input.locked } : {}),
    ...(input.scale !== undefined ? { scale: input.scale } : {}),
  };
}

export function buildSiteMapElementInsert(args: {
  siteMapId: string;
  input: SiteMapElementCreateInput;
  elementId?: string;
}): TablesInsert<"site_map_elements"> {
  const { input } = args;
  const id = args.elementId ?? input.id ?? crypto.randomUUID();
  const elementType = normalizeElementType(input.elementType ?? input.type);

  return {
    id,
    site_map_id: args.siteMapId,
    name: input.name ?? input.label ?? `${elementType}_${id.slice(0, 8)}`,
    element_type: elementType,
    x: roundInteger(input.x),
    y: roundInteger(input.y),
    width: roundInteger(input.width),
    height: roundInteger(input.height),
    rotation: roundDecimal(input.rotation),
    color: input.color ?? input.fill ?? "#3b82f6",
    stroke_color: input.strokeColor ?? input.stroke ?? "#1e40af",
    stroke_width: roundInteger(input.strokeWidth, 1),
    opacity: roundDecimal(input.opacity, 1),
    properties: interactionProperties(input),
    path_data: input.pathData ?? null,
    shape_data:
      input.shapeData === undefined
        ? null
        : jsonObject(input.shapeData ?? undefined),
  };
}

export function buildSiteMapElementUpdate(
  input: SiteMapElementUpdateInput,
  currentProperties: Json | null,
): TablesUpdate<"site_map_elements"> {
  const update: TablesUpdate<"site_map_elements"> = {};
  if (input.name !== undefined || input.label !== undefined) {
    update.name = input.name ?? input.label;
  }
  if (input.elementType !== undefined || input.type !== undefined) {
    update.element_type = normalizeElementType(input.elementType ?? input.type);
  }
  if (input.x !== undefined) update.x = roundInteger(input.x);
  if (input.y !== undefined) update.y = roundInteger(input.y);
  if (input.width !== undefined) update.width = roundInteger(input.width);
  if (input.height !== undefined) update.height = roundInteger(input.height);
  if (input.rotation !== undefined)
    update.rotation = roundDecimal(input.rotation);
  if (input.opacity !== undefined) update.opacity = roundDecimal(input.opacity);
  if (input.color !== undefined || input.fill !== undefined) {
    update.color = input.color ?? input.fill;
  }
  if (input.strokeColor !== undefined || input.stroke !== undefined) {
    update.stroke_color = input.strokeColor ?? input.stroke;
  }
  if (input.strokeWidth !== undefined) {
    update.stroke_width = roundInteger(input.strokeWidth);
  }
  if (input.pathData !== undefined) update.path_data = input.pathData;
  if (input.shapeData !== undefined) {
    update.shape_data =
      input.shapeData === null ? null : jsonObject(input.shapeData);
  }
  if (
    input.properties !== undefined ||
    input.data !== undefined ||
    input.layerId !== undefined ||
    input.visible !== undefined ||
    input.locked !== undefined ||
    input.scale !== undefined
  ) {
    update.properties = interactionProperties(input, currentProperties);
  }
  return update;
}

export function crossMapElementIds(
  rows: ReadonlyArray<{ id: string; site_map_id: string }>,
  siteMapId: string,
) {
  return rows
    .filter((row) => row.site_map_id !== siteMapId)
    .map((row) => row.id);
}

type SiteMapElementSyncError = {
  code: string;
  message: string;
};

export function isMissingSiteMapElementSyncFunction(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  const text = [candidate.message, candidate.details]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return (
    (candidate.code === "PGRST202" || /does not exist/i.test(text)) &&
    /sync_site_map_elements/i.test(text)
  );
}

function syncError(code: string, message: string): SiteMapElementSyncError {
  return { code, message };
}

function elementUpdateFields(row: Record<string, unknown>) {
  const { id: _id, site_map_id: _siteMapId, ...fields } = row;
  return fields;
}

/**
 * Compatibility path for deployments that have not installed the atomic sync
 * RPC yet. The caller must pass a service client only after map edit access and
 * acting-organization scope have both been verified server-side.
 */
export async function syncSiteMapElementsWithoutRpc(args: {
  dataClient: any;
  siteMapId: string;
  rows: Array<Record<string, unknown>>;
  deleteMissing: boolean;
}): Promise<{ data: unknown[] | null; error: SiteMapElementSyncError | null }> {
  const { dataClient, siteMapId, rows, deleteMissing } = args;
  const ids = rows.map((row) => String(row.id));

  const existingById = ids.length > 0
    ? await dataClient
        .from("site_map_elements")
        .select("id, site_map_id")
        .in("id", ids)
    : { data: [], error: null };
  if (existingById.error) {
    return {
      data: null,
      error: syncError("dependency_unavailable", existingById.error.message),
    };
  }

  const conflictingIds = crossMapElementIds(existingById.data ?? [], siteMapId);
  if (conflictingIds.length > 0) {
    return {
      data: null,
      error: syncError("23505", "Element id belongs to another site map"),
    };
  }

  const existingIds = new Set(
    (existingById.data ?? []).map((row: { id: string }) => row.id),
  );
  const newRows = rows.filter((row) => !existingIds.has(String(row.id)));
  const changedRows = rows.filter((row) => existingIds.has(String(row.id)));

  if (newRows.length > 0) {
    const inserted = await dataClient.from("site_map_elements").insert(newRows);
    if (inserted.error) {
      return {
        data: null,
        error: syncError(inserted.error.code || "dependency_unavailable", inserted.error.message),
      };
    }
  }

  // Bound concurrency so a large canvas cannot fan out hundreds of simultaneous
  // requests while this compatibility mode is active.
  for (let offset = 0; offset < changedRows.length; offset += 20) {
    const batch = changedRows.slice(offset, offset + 20);
    const updates = await Promise.all(
      batch.map(async (row) => {
        const result = await dataClient
          .from("site_map_elements")
          .update(elementUpdateFields(row))
          .eq("id", row.id)
          .eq("site_map_id", siteMapId)
          .select("id")
          .maybeSingle();
        if (result.error) return result.error;
        if (!result.data) return syncError("element_not_found", "Element update missed its site map");
        return null;
      }),
    );
    const failedUpdate = updates.find(Boolean);
    if (failedUpdate) {
      return {
        data: null,
        error: syncError(
          (failedUpdate as { code?: string }).code || "dependency_unavailable",
          (failedUpdate as { message?: string }).message || "Unable to update a site-map element",
        ),
      };
    }
  }

  if (deleteMissing) {
    const current = await dataClient
      .from("site_map_elements")
      .select("id")
      .eq("site_map_id", siteMapId);
    if (current.error) {
      return {
        data: null,
        error: syncError("dependency_unavailable", current.error.message),
      };
    }
    const wantedIds = new Set(ids);
    const staleIds = (current.data ?? [])
      .map((row: { id: string }) => row.id)
      .filter((id: string) => !wantedIds.has(id));
    if (staleIds.length > 0) {
      const deleted = await dataClient
        .from("site_map_elements")
        .delete()
        .eq("site_map_id", siteMapId)
        .in("id", staleIds);
      if (deleted.error) {
        return {
          data: null,
          error: syncError("dependency_unavailable", deleted.error.message),
        };
      }
    }
  }

  const saved = await dataClient
    .from("site_map_elements")
    .select("*")
    .eq("site_map_id", siteMapId)
    .order("created_at", { ascending: true });
  if (saved.error) {
    return {
      data: null,
      error: syncError("dependency_unavailable", saved.error.message),
    };
  }
  return { data: saved.data ?? [], error: null };
}
