export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-10 w-48 rounded-lg bg-white/5 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
    </div>
  )
}
