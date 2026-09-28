import { describe, expect, it } from "vitest";
import { evaluateCulturalAuthority } from "../lib/music/creator-cultural-memory-trust/cultural-authority-policy";
describe("authority",()=>{it("denies disputed authority",()=>expect(evaluateCulturalAuthority({active:true,disputed:true,scope:["x"],requestedScope:"x",effectiveAt:new Date().toISOString()}).allowed).toBe(false));});
