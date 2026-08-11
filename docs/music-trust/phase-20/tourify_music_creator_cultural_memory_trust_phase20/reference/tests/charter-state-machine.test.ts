import { describe, expect, it } from "vitest";
import { canTransitionCharter } from "../lib/music/creator-cultural-memory-trust/trust-charter-state-machine";
describe("charter state",()=>{it("denies direct draft to effective",()=>expect(canTransitionCharter({from:"draft",to:"effective"})).toBe(false));});
