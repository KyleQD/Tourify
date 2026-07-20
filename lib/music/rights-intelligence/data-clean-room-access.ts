export interface CleanRoomQuery {
  templateId: string
  requestedColumns: string[]
  requestedFilters: Record<string, string | number | boolean>
  purposeId: string
}

export interface CleanRoomPolicy {
  allowedTemplateIds: string[]
  prohibitedColumns: string[]
}

export function authorizeCleanRoomQuery(input: {
  query: CleanRoomQuery
  policy: CleanRoomPolicy
}): boolean {
  return input.policy.allowedTemplateIds.includes(input.query.templateId) &&
    input.query.requestedColumns.every((column) => !input.policy.prohibitedColumns.includes(column))
}
