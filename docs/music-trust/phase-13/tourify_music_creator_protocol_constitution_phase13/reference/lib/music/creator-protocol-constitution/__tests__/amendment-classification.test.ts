import { classifyAmendment } from "../amendment-classification"

describe("classifyAmendment",()=>{
 it("classifies fundamental effects as fundamental",()=>expect(classifyAmendment({changesFundamentalRight:true,changesReservedPower:false,breaksInteroperability:false,changesOperatorConfigurationOnly:false,isTypographicalOnly:false})).toBe("fundamental"))
 it("classifies breaking interoperability separately",()=>expect(classifyAmendment({changesFundamentalRight:false,changesReservedPower:false,breaksInteroperability:true,changesOperatorConfigurationOnly:false,isTypographicalOnly:false})).toBe("breaking_protocol"))
})
