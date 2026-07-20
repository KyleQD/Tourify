import { redirect } from 'next/navigation'

interface BlogIdRedirectPageProps {
  params: Promise<{ id: string }>
}

export default async function BlogIdRedirectPage({ params }: BlogIdRedirectPageProps) {
  const { id } = await params
  redirect(`/artist/press/${id}`)
}
