export type DashboardDependencyResult =
  | { readonly status: 'rejected'; readonly reason?: unknown }
  | { readonly status: 'fulfilled'; readonly value?: unknown }

export function collectUnavailableDashboardDomains(
  domainResults: ReadonlyArray<readonly [string, DashboardDependencyResult]>,
): string[] {
  return domainResults.flatMap(([domain, result]) => {
    if (result.status === 'rejected') return [domain]

    const queryError = (result.value as { error?: unknown } | null | undefined)?.error
    return queryError ? [domain] : []
  })
}
