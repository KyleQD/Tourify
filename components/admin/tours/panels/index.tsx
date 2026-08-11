"use client"

/**
 * TOUR-204 — Command-center editor bundles.
 * Each panel is a separate chunk; the tour page mounts them only for the active tab.
 */

import dynamic from "next/dynamic"
import { OperationsPanelLoading } from "@/components/admin/operations/operations-command-shell"

export const TourEventsPanel = dynamic(
  () => import("@/components/admin/tour-event-manager").then((m) => m.TourEventManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)

export const TourTeamPanel = dynamic(
  () => import("@/components/admin/tour-team-manager").then((m) => m.TourTeamManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)

export const TourGrantAdminsPanel = dynamic(
  () => import("@/components/admin/grant-tour-admins-panel").then((m) => m.GrantTourAdminsPanel),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)

export const TourVendorPanel = dynamic(
  () => import("@/components/admin/tour-vendor-manager").then((m) => m.TourVendorManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)

export const TourJobsPanel = dynamic(
  () => import("@/components/admin/tour-jobs-list").then((m) => m.TourJobsList),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)

export const TourJobPostingPanel = dynamic(
  () => import("@/components/admin/tour-job-posting").then((m) => m.TourJobPosting),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)

export const TourFinancePanel = dynamic(
  () => import("@/components/admin/tour-finance-manager").then((m) => m.TourFinanceManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)

export const TourCalendarPanel = dynamic(
  () => import("@/components/admin/tour-calendar-sync").then((m) => m.TourCalendarSync),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)

export const TourLogisticsPanel = dynamic(
  () => import("@/components/admin/logistics-dynamic-manager").then((m) => m.LogisticsDynamicManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> },
)
