import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import * as launchCapabilityImport from '../lib/config/launch-capabilities.ts'

const launchCapabilityModule = launchCapabilityImport.default ?? launchCapabilityImport
const { PRODUCTION_DENIED_ROUTE_PREFIXES, routeMatchesPrefix } = launchCapabilityModule

const ROOT = process.cwd()
const CLIENT_ROOTS = ['app', 'components', 'contexts', 'hooks', 'lib']
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
const SOURCE_SCAN_EXCEPTIONS = new Map([
  // This is a development-only CSP source assembled behind an explicit
  // development boolean; the production policy is contract-tested separately.
  ['lib/config/security-headers.ts', new Set(['127.0.0.1:7556 debug endpoint'])],
])
const FORBIDDEN_PATTERNS = [
  { label: 'localhost debug ingest URL', pattern: /https?:\/\/(?:127\.0\.0\.1|localhost):7556\/ingest\b/ },
  { label: '127.0.0.1:7556 debug endpoint', pattern: /127\.0\.0\.1:7556/ },
  { label: 'agent log region marker', pattern: /#region agent log/ },
  { label: 'agent hypothesis marker', pattern: /\bhypothesisId\s*:/ },
  { label: 'debug session header', pattern: /\bX-Debug-Session-Id\b/i },
  { label: 'temporary production bypass flag', pattern: /\b(?:TEMP|DEBUG)_BYPASS_(?:AUTH|RLS|SCHEMA)\b/ },
]

export function scanProductionDebugSource(source) {
  return FORBIDDEN_PATTERNS
    .filter((forbidden) => forbidden.pattern.test(source))
    .map((forbidden) => forbidden.label)
}

export function appFileToRoute(file) {
  const relative = file.replaceAll('\\', '/').replace(/^.*?\/app\//, '/')
  const withoutLeaf = relative.replace(/\/(?:page|route)\.[cm]?[jt]sx?$/, '') || '/'
  const segments = withoutLeaf
    .split('/')
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
    .filter((segment) => !segment.startsWith('@'))
  return `/${segments.join('/')}`
}

export function isUnsafeProductionRoute(pathname) {
  const segments = pathname.toLowerCase().split('/').filter(Boolean)
  return segments.some((segment) =>
    segment === 'debug'
    || segment === 'test'
    || segment === 'seed'
    || segment === 'migrations'
    || segment === 'migration'
    || segment.startsWith('debug-')
    || segment.endsWith('-debug')
    || segment.startsWith('test-')
    || segment.endsWith('-test'),
  )
}

export function isCoveredByProductionDenyRegistry(pathname) {
  return PRODUCTION_DENIED_ROUTE_PREFIXES.some((prefix) => routeMatchesPrefix(pathname, prefix))
}

async function walk(dir, files = []) {
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return files
    throw error
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue
      await walk(fullPath, files)
      continue
    }

    if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

async function main() {
  const files = (
    await Promise.all(CLIENT_ROOTS.map((root) => walk(path.join(ROOT, root))))
  ).flat()

  const failures = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const relativeFile = path.relative(ROOT, file).replaceAll('\\', '/')
    const permittedLabels = SOURCE_SCAN_EXCEPTIONS.get(relativeFile) ?? new Set()
    for (const label of scanProductionDebugSource(source)) {
      if (!permittedLabels.has(label)) failures.push(`${relativeFile} contains ${label}`)
    }
  }

  const appRoutes = files
    .filter((file) => file.includes(`${path.sep}app${path.sep}`))
    .filter((file) => /[\\/](?:page|route)\.[cm]?[jt]sx?$/.test(file))
    .map((file) => ({ file, pathname: appFileToRoute(file) }))
    .filter(({ pathname }) => isUnsafeProductionRoute(pathname))

  for (const { file, pathname } of appRoutes) {
    if (!isCoveredByProductionDenyRegistry(pathname)) {
      failures.push(`${path.relative(ROOT, file)} exposes unregistered production-unsafe route ${pathname}`)
    }
  }

  if (failures.length > 0) {
    console.error('Production debug/test/seed/migration check failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  console.log(
    `Production debug artifact check passed; ${appRoutes.length} unsafe route(s) are covered by the production deny registry.`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
