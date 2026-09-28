"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"

export interface AdminDataColumn<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  width?: string
}

interface AdminDataTableProps<T> {
  items: T[]
  columns: AdminDataColumn<T>[]
  getRowKey: (item: T) => string
  getRowHref: (item: T) => string
  getRowLabel: (item: T) => string
  caption: string
  loading?: boolean
  emptyMessage?: string
  pageSize?: number
}

/** A bounded desktop table with the same fields presented as readable mobile cards. */
export function AdminDataTable<T>({
  items,
  columns,
  getRowKey,
  getRowHref,
  getRowLabel,
  caption,
  loading = false,
  emptyMessage = "No records to display",
  pageSize = 25,
}: AdminDataTableProps<T>) {
  const [requestedPage, setRequestedPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(requestedPage, pageCount - 1)
  const visible = items.slice(page * pageSize, (page + 1) * pageSize)
  const primary = columns[0]

  if (loading) {
    return <div className="flex min-h-48 items-center justify-center text-sm text-slate-400" role="status">Loading…</div>
  }

  if (!items.length || !primary) {
    return <p className="py-12 text-center text-sm text-slate-400">{emptyMessage}</p>
  }

  return (
    <div className="min-w-0">
      <div className="hidden overflow-x-auto rounded-sm border border-slate-700/50 xl:block" tabIndex={0} aria-label={`${caption} table, scroll horizontally for more columns`}>
        <table className="w-full min-w-[760px] table-fixed text-left text-sm text-slate-200">
          <caption className="sr-only">{caption}</caption>
          <colgroup>{columns.map((column) => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
          <thead className="bg-slate-800/70 text-slate-300">
            <tr>{columns.map((column) => <th key={column.key} scope="col" className="px-4 py-3 font-medium">{column.header}</th>)}</tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={getRowKey(item)} className="border-t border-slate-700/50 hover:bg-slate-800/40">
                {columns.map((column, index) => (
                  <td key={column.key} className="min-w-0 px-4 py-3 align-top break-words">
                    {index === 0 ? (
                      <Link href={getRowHref(item)} title={getRowLabel(item)} className="line-clamp-2 break-words font-medium text-white underline-offset-2 hover:underline focus-visible:line-clamp-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400">
                        {column.render(item)}
                      </Link>
                    ) : column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 xl:hidden" aria-label={caption}>
        {visible.map((item) => (
          <li key={getRowKey(item)} className="min-w-0 rounded-sm border border-slate-700/60 bg-slate-800/40 p-4">
            <Link href={getRowHref(item)} title={getRowLabel(item)} className="line-clamp-2 break-words font-semibold text-white underline-offset-2 hover:underline focus-visible:line-clamp-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400">
              {primary.render(item)}
            </Link>
            <dl className="mt-3 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              {columns.slice(1).map((column) => (
                <div key={column.key} className="col-span-2 grid min-w-0 grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] gap-x-4">
                  <dt className="text-slate-400">{column.header}</dt>
                  <dd className="min-w-0 break-words text-slate-100">{column.render(item)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300" aria-label={`${caption} pages`}>
          <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, items.length)} of {items.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-sm border border-slate-600 px-3 py-2 disabled:opacity-40" disabled={page === 0} onClick={() => setRequestedPage(page - 1)}>Previous</button>
            <span aria-live="polite">Page {page + 1} of {pageCount}</span>
            <button type="button" className="rounded-sm border border-slate-600 px-3 py-2 disabled:opacity-40" disabled={page === pageCount - 1} onClick={() => setRequestedPage(page + 1)}>Next</button>
          </div>
        </nav>
      )}
    </div>
  )
}
