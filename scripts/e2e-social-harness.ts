/*
 Minimal e2e harness to validate provider posting paths via Edge Function.
 Usage:
  SUPABASE_URL=... USER_JWT=... npx tsx scripts/e2e-social-harness.ts
  (also accepts NEXT_PUBLIC_SUPABASE_URL)
*/

import 'dotenv/config'
import fetch from 'node-fetch'

function getEnv(names: string[]): string {
  const value = names.map((name) => process.env[name]).find(Boolean)
  if (!value) throw new Error(`Missing env ${names.join(' or ')}`)
  return value
}

function hasAnyEnv(names: string[]): boolean {
  return names.some((name) => Boolean(process.env[name]))
}

function logSkip(message: string) {
  // eslint-disable-next-line no-console
  console.warn(`[SKIP] ${message}`)
}

async function main() {
  if (!hasAnyEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'])) {
    logSkip('Missing Supabase URL. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL to run.')
    return
  }
  if (!hasAnyEnv(['USER_JWT'])) {
    logSkip('Missing USER_JWT. Social e2e requires a signed-in user JWT.')
    return
  }

  const supabaseUrl = getEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'])
  const userJwt = getEnv(['USER_JWT'])

  const url = `${supabaseUrl}/functions/v1/social-post`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${userJwt}`,
      // Supabase Edge respects anon key via Authorization header; userJwt must be a valid session JWT
      'x-client-info': 'e2e-social-harness'
    },
    body: JSON.stringify({
      content: 'Test post from harness',
      mediaUrls: [],
      targets: ['facebook','instagram','youtube','tiktok','twitter'],
      overrides: {
        twitter: { content: 'Twitter short msg from harness' }
      },
      dryRun: true
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`social-post failed: ${res.status} ${text}`)
  }
  const json = await res.json()
  // eslint-disable-next-line no-console
  console.log('social-post dry-run results:', JSON.stringify(json, null, 2))

  const analyticsUrl = `${supabaseUrl}/functions/v1/social-analytics`
  const resAnalytics = await fetch(analyticsUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${userJwt}`,
    },
    body: JSON.stringify({})
  })
  if (!resAnalytics.ok) {
    const text = await resAnalytics.text()
    throw new Error(`social-analytics failed: ${resAnalytics.status} ${text}`)
  }
  const analyticsJson = await resAnalytics.json()
  // eslint-disable-next-line no-console
  console.log('social-analytics result:', analyticsJson)
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(1)
})


