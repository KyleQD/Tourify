"use client"

import dynamic from "next/dynamic"
import { OperationsPanelLoading } from "@/components/admin/operations/operations-command-shell"

export const EventStaffPanel = dynamic(
  () => import("@/components/admin/event-staff-manager").then((m) => m.EventStaffManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> }
)

export const EventVendorPanel = dynamic(
  () => import("@/components/admin/event-vendor-manager").then((m) => m.EventVendorManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> }
)

export const EventJobsPanel = dynamic(
  () => import("@/components/admin/event-jobs-list").then((m) => m.EventJobsList),
  { ssr: false, loading: () => <OperationsPanelLoading /> }
)

export const EventJobPostingPanel = dynamic(
  () => import("@/components/admin/event-job-posting").then((m) => m.EventJobPosting),
  { ssr: false, loading: () => <OperationsPanelLoading /> }
)

export const EventTicketPanel = dynamic(
  () => import("@/components/admin/event-ticket-manager").then((m) => m.EventTicketManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> }
)

export const EventFinancePanel = dynamic(
  () => import("@/components/admin/event-finance-manager").then((m) => m.EventFinanceManager),
  { ssr: false, loading: () => <OperationsPanelLoading /> }
)
