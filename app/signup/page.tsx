import { redirect } from 'next/navigation'

interface SignUpPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = (await searchParams) || {}
  const redirectParams = new URLSearchParams()
  redirectParams.set('tab', 'signup')

  for (const [key, value] of Object.entries(params)) {
    if (key === 'tab') continue
    if (Array.isArray(value)) {
      for (const item of value) redirectParams.append(key, item)
      continue
    }
    if (typeof value === 'string') redirectParams.set(key, value)
  }

  redirect(`/login?${redirectParams.toString()}`)
}

