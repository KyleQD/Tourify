import { z } from "zod";

export const siteMapActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

const presenceCommandSchema = z
  .object({
    action: z.literal("VIEW"),
    entityType: z.literal("presence"),
    newValues: z
      .object({
        action: z.literal("joined"),
      })
      .strict(),
  })
  .strict();

const elementStatusCommandSchema = z
  .object({
    action: z.literal("STATUS_CHANGE"),
    entityType: z.literal("status_change"),
    entityId: z.string().min(1).max(255),
    newValues: z
      .object({
        status: z.enum([
          "not_started",
          "in_progress",
          "setup_complete",
          "needs_attention",
          "blocked",
          "verified",
        ]),
        notes: z.string().trim().max(2_000).optional(),
      })
      .strict(),
  })
  .strict();

export const siteMapActivityCommandSchema = z.discriminatedUnion("action", [
  presenceCommandSchema,
  elementStatusCommandSchema,
]);

export type SiteMapActivityCommand = z.infer<
  typeof siteMapActivityCommandSchema
>;

export function buildSiteMapActivityInsert(args: {
  siteMapId: string;
  userId: string;
  command: SiteMapActivityCommand;
}) {
  const { command } = args;
  return {
    site_map_id: args.siteMapId,
    user_id: args.userId,
    action: command.action,
    entity_type: command.entityType,
    entity_id: command.action === "STATUS_CHANGE" ? command.entityId : null,
    old_values: null,
    new_values: command.newValues,
  };
}
