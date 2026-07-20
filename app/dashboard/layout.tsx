import { DashboardThemeProvider } from '@/components/dashboard/dashboard-theme-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardThemeProvider>{children}</DashboardThemeProvider>
}
