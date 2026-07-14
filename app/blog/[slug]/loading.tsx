import { Loader2 } from 'lucide-react'

export default function BlogArticleLoading() {
  return (
    <div className="min-h-screen bg-[#03030a] pb-24 pt-[calc(3.5rem+1rem)] text-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 px-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-white">Loading article</p>
          <p className="text-sm text-slate-500">Pulling the published story into view.</p>
        </div>
      </div>
    </div>
  )
}
