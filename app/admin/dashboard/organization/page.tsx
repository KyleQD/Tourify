'use client'

import { useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { readAccountFromSearch } from '@/lib/navigation/account-context-url'
import { resolveOrganizationDashboardAccount } from '@/lib/accounts/resolve-organization-dashboard-account'
import { useAdminCapabilities } from '@/hooks/use-admin-capabilities'
import type { AdminCapability } from '@/lib/auth/admin-capabilities'
import type { LucideIcon } from 'lucide-react'
import { OrgTeamGrantsPanel } from '@/components/admin/org-team-grants-panel'
import { OrgSettingsPanel } from '@/components/admin/organization/org-settings-panel'
import { OrgSecuritySummaryPanel } from '@/components/admin/organization/org-security-summary-panel'
import { AdminPageHeader } from '../components/admin-page-header'
import { AdminEmptyState } from '../components/admin-empty-state'
import { BandHub } from '@/components/admin/band-hub'
import { OrgAuditLogPanel } from '@/components/admin/organization/org-audit-log-panel'
import { OrgCapabilitiesPanel } from '@/components/admin/organization/org-capabilities-panel'
import { OrgRetentionSummaryPanel } from '@/components/admin/organization/org-retention-summary-panel'
import { OrgToursHealthPanel } from '@/components/admin/organization/org-tours-health-panel'
import { OrgSavedViewsPanel } from '@/components/admin/organization/org-saved-views-panel'
import { OrgPublicationSloPanel } from '@/components/admin/organization/org-publication-slo-panel'
import { OrgCommunicationsPanel } from '@/components/admin/organization/org-communications-panel'
import { OrgWorkforceSettingsPanel } from '@/components/admin/organization/org-workforce-settings-panel'
import { OrgFinanceSettingsPanel } from '@/components/admin/organization/org-finance-settings-panel'
import { OrgVendorGovernancePanel } from '@/components/admin/organization/org-vendor-governance-panel'
import { OrgTicketingSettingsPanel } from '@/components/admin/organization/org-ticketing-settings-panel'
import { OrgObservabilityPanel } from '@/components/admin/organization/org-observability-panel'
import { OrgReportingConfigPanel } from '@/components/admin/organization/org-reporting-config-panel'
import { OrgOverviewPanel } from '@/components/admin/organization/org-overview-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  Music,
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  ScrollText,
  Zap,
  Archive,
  Globe,
  Radio,
  MessageSquare,
  UserCheck,
  DollarSign,
  Briefcase,
  Ticket,
  Activity,
  BarChart3,
  ChevronDown,
} from 'lucide-react'
import { ORGANIZATION_WORKSPACE_GROUPS, type OrganizationTabId } from '@/lib/admin/organization-workspace-tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// ─── Tab definitions ────────────────────────────────────────────────────────

interface TabDef {
  id: string
  label: string
  icon: LucideIcon
  requiresAny?: AdminCapability[]
}

const TABS: TabDef[] = [
  { id: 'overview',       label: 'Overview',       icon: LayoutDashboard },
  { id: 'team',           label: 'Team',           icon: Users },
  { id: 'settings',       label: 'Settings',       icon: Settings,      requiresAny: ['org.settings.manage'] },
  { id: 'security',       label: 'Security',       icon: Shield,        requiresAny: ['audit.view', 'org.roles.manage'] },
  { id: 'audit',          label: 'Audit',          icon: ScrollText,    requiresAny: ['audit.view'] },
  { id: 'capabilities',   label: 'Capabilities',   icon: Zap,           requiresAny: ['org.settings.manage'] },
  { id: 'retention',      label: 'Retention',      icon: Archive,       requiresAny: ['org.settings.manage', 'audit.view'] },
  { id: 'tours',          label: 'Tours',          icon: Globe,         requiresAny: ['tour.view', 'tour.manage'] },
  { id: 'publishing',     label: 'Publishing',     icon: Radio,         requiresAny: ['tour.publish'] },
  { id: 'communications', label: 'Comms',          icon: MessageSquare, requiresAny: ['communications.send', 'org.settings.manage'] },
  { id: 'workforce',      label: 'Workforce',      icon: UserCheck,     requiresAny: ['workforce.manage', 'hiring.manage'] },
  { id: 'finance',        label: 'Finance',        icon: DollarSign,    requiresAny: ['finance.view', 'finance.manage'] },
  { id: 'vendors',        label: 'Vendors',        icon: Briefcase,     requiresAny: ['vendor.view', 'contract.view'] },
  { id: 'ticketing',      label: 'Ticketing',      icon: Ticket,        requiresAny: ['ticketing.manage', 'ticketing.view'] },
  { id: 'observability',  label: 'Observability',  icon: Activity,      requiresAny: ['audit.view'] },
  { id: 'reporting',      label: 'Reporting',      icon: BarChart3,     requiresAny: ['tour.view'] },
]

const TRIGGER_CLASS =
  'data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm'

// ─── Placeholder for unbuilt tabs ───────────────────────────────────────────

function TabPlaceholder({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <AdminEmptyState
      icon={Icon}
      title={`${label} governance`}
      description="This section is being built out. Check back soon."
    />
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function OrganizationProfilePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentAccount, accounts, isAccountsReady, isLoading } = useMultiAccount()
  const { canAny, capabilities } = useAdminCapabilities()
  const requestedAccountId = readAccountFromSearch(searchParams.toString())

  const organization = useMemo(() => {
    return resolveOrganizationDashboardAccount(accounts, currentAccount, requestedAccountId)
  }, [currentAccount, accounts, requestedAccountId])

  const subtype =
    (organization?.profile_data as { subtype?: string; organization_type?: string } | undefined)
      ?.subtype ||
    (organization?.profile_data as { organization_type?: string } | undefined)?.organization_type ||
    null
  const isBand = subtype === 'band'

  // ─── Active tab (URL-preserved) ────────────────────────────────────────
  const activeTab = searchParams.get('tab') ?? 'overview'

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/admin/dashboard/organization?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // ─── Capability gate per tab ───────────────────────────────────────────
  function isTabAllowed(tab: TabDef): boolean {
    if (!tab.requiresAny) return true
    if (capabilities === null) return true // loading — optimistic
    return canAny(tab.requiresAny)
  }

  // ─── No-org state ──────────────────────────────────────────────────────
  const noOrgContent = requestedAccountId && (isLoading || !isAccountsReady) ? (
    <p className="text-sm text-slate-400">Loading the selected organization account…</p>
  ) : (
    <AdminEmptyState
      icon={isBand ? Music : Building2}
      title={requestedAccountId ? 'Organization unavailable' : 'Select an organization account'}
      description={
        requestedAccountId
          ? 'This organization account is not available to your current session.'
          : 'Switch to an Organization account to manage team grants, artist roster, and hiring scope.'
      }
      action={{ label: 'Open Hiring Hub', href: '/admin/dashboard/hiring' }}
    />
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        icon={isBand ? Music : Building2}
        title={isBand ? 'Band Hub' : 'Organization'}
        subtitle={
          isBand
            ? 'Manage the public band page, member roster, launch checklist, and manager access.'
            : 'Organization governance — settings, security, team, and domain health across all operational areas.'
        }
      />

      {!organization ? (
        noOrgContent
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* ── Grouped workspace navigation — replaces 16 flat tabs with 6 primary groups ── */}
          <nav className="flex items-center gap-1 overflow-x-auto border-b border-slate-700/30 px-1 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400" aria-label="Organization workspace sections" tabIndex={0}>
            {ORGANIZATION_WORKSPACE_GROUPS.map((group) => {
              const hasSecondary = group.secondary.length > 0;
              const isGroupActive = group.primaryTab === activeTab || group.secondary.some((s) => s.id === activeTab);
              const activeSecondary = group.secondary.find((s) => s.id === activeTab);
              const displayLabel = activeSecondary?.label ?? group.label;

              // Check if any tab in the group is allowed
              const primaryAllowed = isTabAllowed(TABS.find(t => t.id === group.primaryTab)!)
              const secondaryAllowed = group.secondary.some(s => {
                const tabDef = TABS.find(t => t.id === s.id)
                return tabDef ? isTabAllowed(tabDef) : false
              })
              const groupAllowed = primaryAllowed || secondaryAllowed

              if (hasSecondary) {
                return (
                  <DropdownMenu key={group.id}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={!groupAllowed}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                          isGroupActive
                            ? "bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        } ${!groupAllowed ? "opacity-50 cursor-not-allowed" : ""}`}
                        aria-current={isGroupActive ? 'page' : undefined}
                      >
                        <group.icon className="h-3.5 w-3.5 shrink-0" />
                        {displayLabel}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-slate-800 border-slate-700 min-w-[180px]">
                      <DropdownMenuItem
                        onClick={() => handleTabChange(group.primaryTab)}
                        className={`text-slate-200 ${activeTab === group.primaryTab ? "bg-slate-700" : ""}`}
                      >
                        {group.label}
                      </DropdownMenuItem>
                      {group.secondary.map((secondary) => {
                        const tabDef = TABS.find(t => t.id === secondary.id)
                        const allowed = tabDef ? isTabAllowed(tabDef) : true
                        return (
                          <DropdownMenuItem
                            key={secondary.id}
                            disabled={!allowed}
                            onClick={() => handleTabChange(secondary.id)}
                            className={`text-slate-200 ${activeTab === secondary.id ? "bg-slate-700" : ""} ${!allowed ? "opacity-50" : ""}`}
                          >
                            {secondary.label}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              return (
                <button
                  type="button"
                  key={group.id}
                  disabled={!groupAllowed}
                  onClick={() => handleTabChange(group.primaryTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                    activeTab === group.primaryTab
                      ? "bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  } ${!groupAllowed ? "opacity-50 cursor-not-allowed" : ""}`}
                  aria-current={activeTab === group.primaryTab ? 'page' : undefined}
                >
                  <group.icon className="h-3.5 w-3.5 shrink-0" />
                  {group.label}
                </button>
              );
            })}
          </nav>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4">
            <OrgOverviewPanel />
          </TabsContent>

          {/* ── Team (existing content — preserved exactly) ── */}
          <TabsContent value="team" className="space-y-4">
            {isBand ? (
              <BandHub
                organizerAccountId={organization.profile_id}
                onboarding={searchParams.get('onboarding') === 'band-created'}
              />
            ) : (
              <OrgTeamGrantsPanel
                organizerAccountId={organization.profile_id}
                subtype={subtype}
              />
            )}
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings" className="space-y-4">
            <OrgSettingsPanel />
          </TabsContent>

          {/* ── Security ── */}
          <TabsContent value="security" className="space-y-4">
            <OrgSecuritySummaryPanel />
          </TabsContent>

          {/* ── Audit ── */}
          <TabsContent value="audit" className="space-y-4">
            <OrgAuditLogPanel />
          </TabsContent>

          {/* ── Capabilities ── */}
          <TabsContent value="capabilities" className="space-y-4">
            <OrgCapabilitiesPanel />
          </TabsContent>

          {/* ── Retention ── */}
          <TabsContent value="retention" className="space-y-4">
            <OrgRetentionSummaryPanel />
          </TabsContent>

          {/* ── Tours ── */}
          <TabsContent value="tours" className="space-y-6">
            <OrgToursHealthPanel />
            <OrgSavedViewsPanel />
          </TabsContent>

          {/* ── Publishing ── */}
          <TabsContent value="publishing" className="space-y-4">
            <OrgPublicationSloPanel />
          </TabsContent>

          {/* ── Communications ── */}
          <TabsContent value="communications" className="space-y-4">
            <OrgCommunicationsPanel />
          </TabsContent>

          {/* ── Workforce ── */}
          <TabsContent value="workforce" className="space-y-4">
            <OrgWorkforceSettingsPanel />
          </TabsContent>

          {/* ── Finance ── */}
          <TabsContent value="finance" className="space-y-4">
            <OrgFinanceSettingsPanel />
          </TabsContent>

          {/* ── Vendors ── */}
          <TabsContent value="vendors" className="space-y-4">
            <OrgVendorGovernancePanel />
          </TabsContent>

          {/* ── Ticketing ── */}
          <TabsContent value="ticketing" className="space-y-4">
            <OrgTicketingSettingsPanel />
          </TabsContent>

          {/* ── Observability ── */}
          <TabsContent value="observability" className="space-y-4">
            <OrgObservabilityPanel />
          </TabsContent>

          {/* ── Reporting ── */}
          <TabsContent value="reporting" className="space-y-4">
            <OrgReportingConfigPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
