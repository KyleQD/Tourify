import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ContractReviewClient } from "./contract-review-client"
import type { ContractReviewRow } from "./contract-review-types"

export default async function ContractReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirectTo=/contracts/${encodeURIComponent(id)}`)

  const { data: contract, error } = await supabase.from("artist_contracts").select("*").eq("id", id).maybeSingle()

  if (error || !contract) notFound()

  const isOwner = contract.user_id === user.id
  const isCounterparty = contract.counterparty_user_id === user.id
  if (!isOwner && !isCounterparty) notFound()

  const row: ContractReviewRow = {
    id: contract.id,
    title: contract.title,
    terms: contract.terms,
    status: contract.status,
    user_id: contract.user_id,
    counterparty_user_id: contract.counterparty_user_id,
    metadata: (contract.metadata ?? null) as ContractReviewRow["metadata"],
  }

  return <ContractReviewClient contract={row} viewerRole={isOwner ? "owner" : "counterparty"} />
}
