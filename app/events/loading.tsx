export default function EventsLoading() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}
