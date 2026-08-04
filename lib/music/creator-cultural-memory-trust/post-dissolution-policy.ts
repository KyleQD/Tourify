export type SurvivingService = "preservation" | "correction" | "finding_aid" | "status_verification" | "mediated_access";
export function maySurviveDissolution(input:{service:SurvivingService; assignedSuccessor:boolean; funding:boolean; restrictionsPreserved:boolean}):boolean { return input.assignedSuccessor && input.funding && input.restrictionsPreserved; }
