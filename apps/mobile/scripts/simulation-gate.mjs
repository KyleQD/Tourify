#!/usr/bin/env node
import { readFileSync, existsSync, realpathSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const catalogPath = fileURLToPath(new URL('../simulation/journeys.json', import.meta.url))
const SHA = /^[a-f0-9]{40}$/i
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/
const CAMPAIGN = /^SIM-\d{8}-\d{2,}$/
const FINDING = /^SIM-\d{8}-\d{3,}$/
const STATUS = new Set(['pass', 'fail', 'blocked', 'bypassed', 'unavailable'])
const SCOPE_STATUS = new Set(['shipped', 'disabled', 'unavailable'])
const PLATFORMS = ['ios', 'android']

function required(value, label, errors) {
  if (typeof value !== 'string' || !value.trim() || /^(pending|placeholder|todo|tbd)$/i.test(value.trim())) {
    errors.push(`${label} is required`)
    return false
  }
  return true
}

function httpsUrl(value, label, errors) {
  if (!required(value, label, errors)) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname) || url.username || url.password || url.search || url.hash) {
      errors.push(`${label} must be an HTTPS service URL without credentials, query, or fragment`)
      return null
    }
    return url.origin
  } catch {
    errors.push(`${label} must be a valid URL`)
    return null
  }
}

function evidenceFile(root, value, label, errors) {
  if (!required(value, label, errors)) return
  if (value.startsWith('/') || value.split(/[\\/]/).includes('..')) {
    errors.push(`${label} must be a relative path inside evidence-dir`)
    return
  }
  const candidate = resolve(root, value)
  if (!existsSync(candidate)) {
    errors.push(`${label} is missing: ${value}`)
    return
  }
  const actual = realpathSync(candidate)
  if (!actual.startsWith(root + sep) || !statSync(actual).isFile()) {
    errors.push(`${label} must resolve to a file inside evidence-dir`)
  }
}

function validate(manifest, results, evidenceDir, catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))) {
  const errors = []
  if (!existsSync(evidenceDir) || !statSync(evidenceDir).isDirectory()) return ['evidence-dir must exist']
  const root = realpathSync(evidenceDir)
  if (!CAMPAIGN.test(manifest.campaignId || '')) errors.push('manifest.campaignId must be SIM-YYYYMMDD-##')
  if (results.campaignId !== manifest.campaignId) errors.push('results.campaignId must match manifest')
  const staging = manifest.staging || {}
  const api = httpsUrl(staging.apiUrl, 'staging.apiUrl', errors)
  const productionApi = httpsUrl(staging.productionApiUrl, 'staging.productionApiUrl', errors)
  const supabase = httpsUrl(staging.supabaseUrl, 'staging.supabaseUrl', errors)
  const productionSupabase = httpsUrl(staging.productionSupabaseUrl, 'staging.productionSupabaseUrl', errors)
  if (api && api === productionApi) errors.push('staging and production API origins must differ')
  if (supabase && supabase === productionSupabase) errors.push('staging and production Supabase origins must differ')
  if (!DEPLOYMENT_ID.test(staging.deploymentId || '') || !DEPLOYMENT_ID.test(staging.productionDeploymentId || ''))
    errors.push('staging and production deployment IDs must be Vercel-generated dpl_ identifiers')
  else if (staging.deploymentId === staging.productionDeploymentId)
    errors.push('staging and production deployment IDs must differ')
  if (!SHA.test(staging.deployedSha || '')) errors.push('staging.deployedSha must be a full 40-character SHA')
  if (results.deployedSha !== staging.deployedSha) errors.push('results.deployedSha must match staging.deployedSha')
  if (staging.stripeMode !== 'test') errors.push('staging.stripeMode must be test')
  evidenceFile(root, staging.isolationEvidence, 'staging.isolationEvidence', errors)
  evidenceFile(root, staging.schemaEvidence, 'staging.schemaEvidence', errors)
  evidenceFile(root, staging.stripeEvidence, 'staging.stripeEvidence', errors)
  for (const platform of ['ios', 'android']) {
    const build = manifest.builds?.[platform] || {}
    if (build.profile !== 'preview') errors.push(`builds.${platform}.profile must be preview`)
    required(build.buildId, `builds.${platform}.buildId`, errors)
    if (!SHA.test(build.sourceSha || '') || build.sourceSha !== staging.deployedSha) errors.push(`builds.${platform}.sourceSha must match deployed SHA`)
    if (httpsUrl(build.apiUrl, `builds.${platform}.apiUrl`, errors) !== api) errors.push(`builds.${platform}.apiUrl must match staging API origin`)
    evidenceFile(root, build.buildEvidence, `builds.${platform}.buildEvidence`, errors)
  }
  // Source routes are candidates. The exact preview builds need an explicit scope decision.
  const candidates = new Set(catalog.journeys.flatMap(journey => PLATFORMS.map(platform => `${journey.id}:${platform}`)))
  const scope = new Map()
  if (!Array.isArray(manifest.journeyScope)) errors.push('manifest.journeyScope must list every catalog journey on both platforms')
  for (const [index, decision] of (Array.isArray(manifest.journeyScope) ? manifest.journeyScope : []).entries()) {
    const label = `journeyScope[${index}]`
    const key = `${decision.journeyId}:${decision.platform}`
    if (!candidates.has(key)) errors.push(`${label} is not a catalog journey/platform: ${key}`)
    if (scope.has(key)) errors.push(`${label} duplicates scope decision: ${key}`)
    scope.set(key, decision)
    if (!SCOPE_STATUS.has(decision.status)) errors.push(`${label}.status must be shipped, disabled, or unavailable`)
    evidenceFile(root, decision.scopeEvidence, `${label}.scopeEvidence`, errors)
    if (decision.status === 'disabled' || decision.status === 'unavailable') {
      required(decision.reason, `${label}.reason`, errors)
      required(decision.approvedBy, `${label}.approvedBy`, errors)
      required(decision.decisionRef, `${label}.decisionRef`, errors)
      evidenceFile(root, decision.approvalEvidence, `${label}.approvalEvidence`, errors)
      if (decision.status === 'unavailable') errors.push(`${key} is unavailable; resolve it or classify an intentionally unshipped feature as disabled`)
    }
  }
  for (const key of candidates) if (!scope.has(key)) errors.push(`missing scope decision: ${key}`)
  for (const platform of PLATFORMS) {
    if (!Array.from(scope.values()).some(decision => decision.platform === platform && decision.status === 'shipped')) errors.push(`no shipped journeys declared for ${platform}`)
  }
  const actors = manifest.actors || {}
  const shippedJourneys = catalog.journeys.filter(journey => PLATFORMS.some(platform => scope.get(`${journey.id}:${platform}`)?.status === 'shipped'))
  const requiredActors = new Set(shippedJourneys.flatMap(journey => journey.receiver === 'same actor' ? [journey.actor] : [journey.actor, journey.receiver]))
  const seenIds = new Set()
  for (const key of requiredActors) {
    const actor = actors[key] || {}
    if (!required(actor.id, `actors.${key}.id`, errors)) continue
    if (seenIds.has(actor.id)) errors.push(`actors.${key}.id duplicates another actor`)
    seenIds.add(actor.id)
    if (actor.campaignId !== manifest.campaignId) errors.push(`actors.${key}.campaignId must match campaign`)
    if (actor.email || actor.password || actor.token || actor.secret) errors.push(`actors.${key} contains credential fields`)
    evidenceFile(root, actor.provisionEvidence, `actors.${key}.provisionEvidence`, errors)
  }
  const expected = new Set()
  for (const journey of catalog.journeys) for (const platform of PLATFORMS) {
    if (scope.get(`${journey.id}:${platform}`)?.status === 'shipped') for (const check of journey.checks) expected.add(`${journey.id}:${platform}:${check}`)
  }
  const seen = new Set()
  for (const [index, observation] of (results.observations || []).entries()) {
    const label = `observations[${index}]`
    const key = `${observation.journeyId}:${observation.platform}:${observation.check}`
    if (!expected.has(key)) errors.push(`${label} has unknown journey/platform/check: ${key}`)
    if (seen.has(key)) errors.push(`${label} duplicates ${key}`)
    seen.add(key)
    const journey = catalog.journeys.find(j => j.id === observation.journeyId)
    if (journey && observation.actorId !== actors[journey.actor]?.id) errors.push(`${label}.actorId does not match ${journey.actor}`)
    if (!STATUS.has(observation.status)) errors.push(`${label}.status is invalid`)
    if (observation.status !== 'pass') {
      if (!FINDING.test(observation.findingId || '')) errors.push(`${label}.findingId is required for non-pass`)
      required(observation.linkedTask, `${label}.linkedTask`, errors)
      errors.push(`${key} is ${observation.status}; only an observed pass closes a check`)
    }
    if (!Number.isFinite(Date.parse(observation.observedAt || ''))) errors.push(`${label}.observedAt must be a timestamp`)
    for (const field of ['startingState', 'steps', 'expected', 'actual', 'endingState']) required(observation[field], `${label}.${field}`, errors)
    if (!Array.isArray(observation.evidence) || observation.evidence.length === 0) errors.push(`${label}.evidence requires at least one file`)
    else observation.evidence.forEach((path, i) => evidenceFile(root, path, `${label}.evidence[${i}]`, errors))
    if (journey && ['success', 'authorization'].includes(observation.check) && journey.receiver !== 'same actor') {
      if (!observation.receiverActorId || !Object.values(actors).some(actor => actor.id === observation.receiverActorId)) errors.push(`${label}.receiverActorId must name a manifest actor`)
    }
  }
  for (const key of expected) if (!seen.has(key)) errors.push(`missing observation: ${key}`)
  const findings = results.findings || []
  for (const observation of results.observations || []) {
    if (observation.status !== 'pass' && !findings.some(finding => finding.id === observation.findingId && finding.linkedTask === observation.linkedTask)) {
      errors.push(`${observation.journeyId}:${observation.platform}:${observation.check} must link to a matching findings entry`)
    }
  }
  for (const finding of findings) {
    if (!FINDING.test(finding.id || '')) errors.push('findings require stable IDs')
    required(finding.linkedTask, `findings.${finding.id}.linkedTask`, errors)
    if (['P0', 'P1'].includes(finding.severity) && finding.status !== 'verified') errors.push(`open ${finding.severity} finding: ${finding.id}`)
  }
  return errors
}

function argsToObject(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 2) out[argv[i]] = argv[i + 1]
  return out
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = argsToObject(process.argv.slice(2))
  if (!args['--manifest'] || !args['--results'] || !args['--evidence-dir']) {
    console.error('Usage: npm run simulation:gate -- --manifest <file> --results <file> --evidence-dir <folder>')
    process.exit(2)
  }
  try {
    const manifest = JSON.parse(readFileSync(args['--manifest'], 'utf8'))
    const results = JSON.parse(readFileSync(args['--results'], 'utf8'))
    const errors = validate(manifest, results, resolve(args['--evidence-dir']))
    const exclusions = (manifest.journeyScope || []).filter(decision => decision.status === 'disabled')
    for (const decision of exclusions) console.log(`Excluded ${decision.journeyId}:${decision.platform} (${decision.status}; ${decision.decisionRef}; approved by ${decision.approvedBy})`)
    if (errors.length) {
      console.error(`Mobile simulation gate failed (${errors.length} issues):\n${errors.map(e => `- ${e}`).join('\n')}`)
      process.exitCode = 1
    } else console.log(`Mobile simulation gate passed: shipped journeys have exact-SHA iOS and Android evidence; ${exclusions.length} approved exclusions are listed above.`)
  } catch (error) {
    console.error(`Mobile simulation gate could not read input: ${error.message}`)
    process.exitCode = 2
  }
}

export { validate }
