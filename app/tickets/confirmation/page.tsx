import { redirect } from 'next/navigation'

export default async function TicketConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; session_id?: string }>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (params.order) qs.set('order', params.order)
  if (params.session_id) qs.set('session_id', params.session_id)
  redirect(`/tickets/success?${qs.toString()}`)
}
