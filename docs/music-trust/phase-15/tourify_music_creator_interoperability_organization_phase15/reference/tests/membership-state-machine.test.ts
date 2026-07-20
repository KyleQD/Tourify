import { describe, expect, it } from "vitest";
import { canTransitionMembership } from "../lib/music/creator-interoperability-organization/membership-state-machine";
describe("membership states", () => { it("blocks inferred direct effectiveness", () => { expect(canTransitionMembership("invited","effective")).toBe(false); }); });
