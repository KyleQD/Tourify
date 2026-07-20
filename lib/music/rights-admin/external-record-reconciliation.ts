export interface ReconcileField { field: string; localValue: unknown; externalValue: unknown; authority: "external" | "tourify" | "manual"; }
export interface ReconciliationResult { accepted: ReconcileField[]; conflicts: ReconcileField[]; }
export function reconcileExternalRecord(fields: ReconcileField[]): ReconciliationResult {
  return fields.reduce<ReconciliationResult>((result, field) => {
    if (JSON.stringify(field.localValue) === JSON.stringify(field.externalValue) || field.authority === "external") result.accepted.push(field);
    else result.conflicts.push(field);
    return result;
  }, { accepted: [], conflicts: [] });
}
