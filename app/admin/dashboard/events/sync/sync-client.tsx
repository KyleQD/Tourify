"use client"

import { useEffect, useState } from "react"

interface SyncRun {
  id: string
  provider: string
  started_at: string
  finished_at: string | null
  status: string
  records_received: number
  records_created: number
  records_updated: number
  error_summary: string | null
}

interface SyncJob {
  id: string
  provider: string
  job_type: string
  status: string
  attempt_count: number
  run_after: string
  last_error_code: string | null
}

export default function SyncClient() {
  const [data, setData] = useState<{ runs: SyncRun[]; jobs: SyncJob[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/event-sync", { credentials: "include" })
      if (!res.ok) {
        setError(`Failed to load (${res.status})`)
        return
      }
      setData(await res.json())
    })()
  }, [])

  return (
    <div className="space-y-6 p-6 text-white">
      <h1 className="text-xl font-semibold">Event sync</h1>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <section>
        <h2 className="mb-2 font-medium">Active queue</h2>
        {data?.jobs.length === 0 && <p className="text-sm text-slate-400">Queue is empty.</p>}
        <ul className="space-y-2 text-sm">
          {data?.jobs.map((job) => (
            <li key={job.id} className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2">
              {job.provider} · {job.job_type} · <span className="text-slate-400">{job.status}</span> · attempts{" "}
              {job.attempt_count}
              {job.last_error_code && <span className="text-red-300"> · {job.last_error_code}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Recent runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="py-1 pr-4">Provider</th>
                <th className="py-1 pr-4">Started</th>
                <th className="py-1 pr-4">Status</th>
                <th className="py-1 pr-4">Received</th>
                <th className="py-1 pr-4">Created</th>
                <th className="py-1 pr-4">Updated</th>
                <th className="py-1">Error</th>
              </tr>
            </thead>
            <tbody>
              {data?.runs.map((run) => (
                <tr key={run.id} className="border-t border-slate-800">
                  <td className="py-1.5 pr-4">{run.provider}</td>
                  <td className="py-1.5 pr-4">{new Date(run.started_at).toLocaleString()}</td>
                  <td className="py-1.5 pr-4">{run.status}</td>
                  <td className="py-1.5 pr-4">{run.records_received}</td>
                  <td className="py-1.5 pr-4">{run.records_created}</td>
                  <td className="py-1.5 pr-4">{run.records_updated}</td>
                  <td className="py-1.5 text-red-300">{run.error_summary ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
