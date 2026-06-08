export default function FeedLoading() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}
