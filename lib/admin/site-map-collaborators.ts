import { z } from "zod";

export const removeSiteMapCollaboratorQuerySchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();
