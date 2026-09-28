import { z } from "zod";

import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

export const SITE_MAP_ZONE_TYPES = [
  "glamping",
  "parking",
  "vendor",
  "food",
  "restroom",
  "utility",
  "entrance",
  "exit",
  "stage",
  "medical",
  "security",
  "storage",
  "other",
] as const;

export const SITE_MAP_ZONE_STATUSES = [
  "available",
  "occupied",
  "reserved",
  "maintenance",
  "closed",
] as const;

const MAX_COORDINATE = 1_000_000;
const MAX_TAGS = 50;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const coordinateSchema = z.number().finite().min(0).max(MAX_COORDINATE);
const dimensionSchema = z.number().finite().positive().max(MAX_COORDINATE);
const boundedIntegerSchema = z.number().int().min(0).max(MAX_COORDINATE);
const nullableText = (max: number) =>
  z.string().trim().min(1).max(max).nullable().optional();

const zoneFields = {
  name: z.string().trim().min(1).max(255),
  zoneType: z.enum(SITE_MAP_ZONE_TYPES),
  x: coordinateSchema,
  y: coordinateSchema,
  width: dimensionSchema,
  height: dimensionSchema,
  rotation: z.number().finite().min(-999.99).max(999.99).optional(),
  color: z.string().regex(HEX_COLOR).optional(),
  borderColor: z.string().regex(HEX_COLOR).optional(),
  borderWidth: z.number().finite().min(0).max(100).optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  capacity: z.number().int().positive().max(MAX_COORDINATE).nullable().optional(),
  currentOccupancy: boundedIntegerSchema.optional(),
  powerAvailable: z.boolean().optional(),
  waterAvailable: z.boolean().optional(),
  internetAvailable: z.boolean().optional(),
  description: nullableText(10_000),
  notes: nullableText(25_000),
  tags: z
    .array(z.string().trim().min(1).max(100))
    .max(MAX_TAGS)
    .optional(),
  status: z.enum(SITE_MAP_ZONE_STATUSES).optional(),
  leadUserId: z.string().uuid().nullable().optional(),
  assignedDepartment: nullableText(100),
};

function validateOccupancy(
  value: { capacity?: number | null; currentOccupancy?: number },
  context: z.RefinementCtx,
) {
  if (
    value.capacity !== null &&
    value.capacity !== undefined &&
    value.currentOccupancy !== undefined &&
    value.currentOccupancy > value.capacity
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Current occupancy cannot exceed capacity",
      path: ["currentOccupancy"],
    });
  }
}

export const siteMapZoneCreateSchema = z
  .object({
    id: z.string().uuid().optional(),
    ...zoneFields,
  })
  .strict()
  .superRefine(validateOccupancy);

export const siteMapZoneUpdateSchema = z
  .object({
    ...zoneFields,
    name: zoneFields.name.optional(),
    zoneType: zoneFields.zoneType.optional(),
    x: zoneFields.x.optional(),
    y: zoneFields.y.optional(),
    width: zoneFields.width.optional(),
    height: zoneFields.height.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one zone field is required",
      });
    }
    validateOccupancy(value, context);
  });

export const siteMapZoneRouteParamsSchema = z
  .object({
    id: z.string().uuid(),
    zoneId: z.string().uuid().optional(),
  })
  .strict();

export const siteMapZoneStarterTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    assignedUserId: z.string().uuid().optional(),
  })
  .strict();

export const siteMapZoneBulkAssignSchema = z
  .object({
    zoneId: z.string().uuid(),
    leadUserId: z.string().uuid().nullable().optional(),
    assignedDepartment: nullableText(100),
    starterTasks: z.array(siteMapZoneStarterTaskSchema).max(50).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.leadUserId === undefined &&
      value.assignedDepartment === undefined &&
      (value.starterTasks?.length ?? 0) === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An ownership change or starter task is required",
      });
    }
  });

export type SiteMapZoneCreateInput = z.infer<typeof siteMapZoneCreateSchema>;
export type SiteMapZoneUpdateInput = z.infer<typeof siteMapZoneUpdateSchema>;

function roundInteger(value: number | undefined, fallback = 0) {
  return Math.round(value ?? fallback);
}

function roundDecimal(value: number | undefined, fallback = 0) {
  return Math.round((value ?? fallback) * 100) / 100;
}

export function buildSiteMapZoneInsert(args: {
  siteMapId: string;
  input: SiteMapZoneCreateInput;
}): TablesInsert<"site_map_zones"> {
  const { input } = args;
  return {
    id: input.id ?? crypto.randomUUID(),
    site_map_id: args.siteMapId,
    name: input.name,
    zone_type: input.zoneType,
    x: roundInteger(input.x),
    y: roundInteger(input.y),
    width: roundInteger(input.width),
    height: roundInteger(input.height),
    rotation: roundDecimal(input.rotation),
    color: input.color ?? "#3b82f6",
    border_color: input.borderColor ?? "#1e40af",
    border_width: roundInteger(input.borderWidth, 2),
    opacity: roundDecimal(input.opacity, 1),
    capacity: input.capacity ?? null,
    current_occupancy: input.currentOccupancy ?? 0,
    power_available: input.powerAvailable ?? false,
    water_available: input.waterAvailable ?? false,
    internet_available: input.internetAvailable ?? false,
    description: input.description ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? [],
    status: input.status ?? "available",
    lead_user_id: input.leadUserId ?? null,
    assigned_department: input.assignedDepartment ?? null,
  };
}

export function buildSiteMapZoneUpdate(
  input: SiteMapZoneUpdateInput,
): TablesUpdate<"site_map_zones"> {
  const update: TablesUpdate<"site_map_zones"> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.zoneType !== undefined) update.zone_type = input.zoneType;
  if (input.x !== undefined) update.x = roundInteger(input.x);
  if (input.y !== undefined) update.y = roundInteger(input.y);
  if (input.width !== undefined) update.width = roundInteger(input.width);
  if (input.height !== undefined) update.height = roundInteger(input.height);
  if (input.rotation !== undefined) update.rotation = roundDecimal(input.rotation);
  if (input.color !== undefined) update.color = input.color;
  if (input.borderColor !== undefined) update.border_color = input.borderColor;
  if (input.borderWidth !== undefined)
    update.border_width = roundInteger(input.borderWidth);
  if (input.opacity !== undefined) update.opacity = roundDecimal(input.opacity);
  if (input.capacity !== undefined) update.capacity = input.capacity;
  if (input.currentOccupancy !== undefined)
    update.current_occupancy = input.currentOccupancy;
  if (input.powerAvailable !== undefined)
    update.power_available = input.powerAvailable;
  if (input.waterAvailable !== undefined)
    update.water_available = input.waterAvailable;
  if (input.internetAvailable !== undefined)
    update.internet_available = input.internetAvailable;
  if (input.description !== undefined) update.description = input.description;
  if (input.notes !== undefined) update.notes = input.notes;
  if (input.tags !== undefined) update.tags = input.tags;
  if (input.status !== undefined) update.status = input.status;
  if (input.leadUserId !== undefined) update.lead_user_id = input.leadUserId;
  if (input.assignedDepartment !== undefined)
    update.assigned_department = input.assignedDepartment;
  return update;
}
