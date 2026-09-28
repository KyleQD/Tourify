import { describe, expect, it } from "vitest";
import { mayDisclose } from "../lib/music/creator-cultural-memory-trust/access-and-disclosure-policy";
describe("access",()=>{it("denies sealed material without cultural approval",()=>expect(mayDisclose({accessClass:"sealed",purposeApproved:true,culturalApproval:false,privacyApproval:true,legalHold:false,disputed:false})).toBe(false));});
