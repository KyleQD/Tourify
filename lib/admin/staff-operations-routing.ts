const HIRING_TAB_REDIRECTS: Record<string, string> = {
  applications: "applications",
  jobs: "jobs",
  onboarding: "onboarding",
  audit: "audit",
}

export function legacyStaffOperationsRedirect(
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const rawTab = Array.isArray(searchParams.tab) ? searchParams.tab[0] : searchParams.tab
  if (!rawTab) return null

  const params = new URLSearchParams()
  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (key === "tab" || rawValue === undefined) continue
    for (const value of Array.isArray(rawValue) ? rawValue : [rawValue]) params.append(key, value)
  }

  const hiringTab = HIRING_TAB_REDIRECTS[rawTab]
  if (hiringTab) {
    params.set("tab", hiringTab)
    return `/admin/dashboard/hiring?${params.toString()}`
  }
  if (rawTab === "payroll") {
    const query = params.toString()
    return `/admin/dashboard/payroll${query ? `?${query}` : ""}`
  }
  if (rawTab === "roster") {
    params.set("tab", "team")
    return `/admin/dashboard/staff?${params.toString()}`
  }
  return null
}

