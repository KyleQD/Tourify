import { describe, expect, it } from "vitest";
import { evaluatePrivilege } from "../lib/music/creator-interoperability-organization/privileges-immunities-gate";
describe("privileges", () => { it("defaults to not applicable without an effective instrument", () => { expect(evaluatePrivilege({legalInstrumentEffective:false,hostJurisdiction:"CH",beneficiaryClass:"official",functionalScope:"official acts",waiverAuthorityConfigured:true,alternativeRemedyAvailable:true}).allowed).toBe(false); }); });
