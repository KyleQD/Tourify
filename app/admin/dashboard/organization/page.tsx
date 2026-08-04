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
} from 'lucide-react'

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
          {/* ── Tab navigation ── */}
          <TabsList className="flex w-full flex-wrap gap-y-1 overflow-x-auto bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30 h-auto">
            {TABS.map((tab) => {
              const allowed = isTabAllowed(tab)
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  disabled={!allowed}
                  className={TRIGGER_CLASS}
                  aria-label={tab.label}
                >
                  <tab.icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

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
