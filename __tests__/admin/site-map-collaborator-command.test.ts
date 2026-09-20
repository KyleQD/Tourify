import { describe, expect, it } from "vitest";

import { removeSiteMapCollaboratorQuerySchema } from "@/lib/admin/site-map-collaborators";

describe("site-map collaborator command boundary", () => {
  it("accepts one exact collaborator user id", () => {
    expect(
      removeSiteMapCollaboratorQuerySchema.parse({
        userId: "00000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({ userId: "00000000-0000-4000-8000-000000000001" });
  });

  it.each([
    {},
    { userId: "not-a-uuid" },
    {
      userId: "00000000-0000-4000-8000-000000000001",
      actingOrgId: "00000000-0000-4000-8000-00000000000b",
    },
  ])("rejects malformed or forged removal input %#", (input) => {
    expect(removeSiteMapCollaboratorQuerySchema.safeParse(input).success).toBe(
      false,
    );
  });
});
