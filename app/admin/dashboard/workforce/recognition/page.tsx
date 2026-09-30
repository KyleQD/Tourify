import Link from 'next/link'
import { resolveAdminWorkforceEmployer } from '@/lib/hiring/resolve-admin-workforce-employer'
import { WorkforceCompletionVerification } from '@/components/achievements/workforce-completion-verification'

export default async function RecognitionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const employer = await resolveAdminWorkforceEmployer({ searchParams: await searchParams })
  return <main className="mx-auto max-w-4xl space-y-5 p-6">
    <Link href="/admin/dashboard/roster" className="text-sm underline">Back to workforce roster</Link>
    <h1 className="text-2xl font-semibold">Workforce completion & advancement</h1>
    {employer ? <><p className="text-sm text-muted-foreground">{employer.displayName}</p><WorkforceCompletionVerification entityType={employer.entityType} entityId={employer.entityId} /></> : <p>Select an employer account to review completed work.</p>}
  </main>
}
