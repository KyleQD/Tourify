import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/** Cursor debug session NDJSON — server-only (imports `fs`). */
const SESSION = '650e81'
const INGEST =
  'http://127.0.0.1:7556/ingest/15f15573-361b-4909-ba46-1f6afc0001bf'

export function agentSessionLogServer(payload: Record<string, unknown>) {
  const body = { sessionId: SESSION, timestamp: Date.now(), ...payload }
  const line = `${JSON.stringify(body)}\n`
  void fetch(INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION,
    },
    body: JSON.stringify(body),
  }).catch(() => {})
  try {
    const dir = join(process.cwd(), '.cursor')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, `debug-${SESSION}.log`), line, { flag: 'a' })
  } catch {
    // ignore (read-only FS, wrong cwd, etc.)
  }
}
