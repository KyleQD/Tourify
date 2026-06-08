export default function SettingsLoading() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}
