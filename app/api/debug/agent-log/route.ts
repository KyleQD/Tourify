import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

function canAppendDebugLog(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.AGENT_DEBUG_FILE_LOG === '1'
  )
}

export async function POST(request: Request) {
  if (!canAppendDebugLog()) {
    return new Response(null, { status: 204 })
  }

  try {
    const payload = await request.json()
    const line = `${JSON.stringify(payload)}\n`
    const dir = join(process.cwd(), '.cursor')
    await mkdir(dir, { recursive: true })
    await appendFile(join(dir, 'debug-958246.log'), line, 'utf8')
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 500 })
  }
}
