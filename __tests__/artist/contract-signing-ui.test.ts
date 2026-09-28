import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("artist contract signing UI", () => {
  it("routes artist contract reviews through the artist-scoped signing page", () => {
    const listPage = readSource("app/artist/business/contracts/page.tsx")

    expect(listPage).toContain('href={`/artist/business/contracts/${contract.id}`}')
    expect(listPage).toContain("Review & sign")
    expect(listPage).toContain("sendContractAction({ contractId")
  })

  it("authenticates and authorizes owner or counterparty before rendering", () => {
    const reviewPage = readSource("app/artist/business/contracts/[id]/page.tsx")

    expect(reviewPage).toContain("await supabase.auth.getUser()")
    expect(reviewPage).toContain("redirect(`/login?redirectTo=/artist/business/contracts/")
    expect(reviewPage).toContain("const isOwner = contract.user_id === user.id")
    expect(reviewPage).toContain("const isCounterparty = contract.counterparty_user_id === user.id")
    expect(reviewPage).toContain("if (!isOwner && !isCounterparty) notFound()")
    expect(reviewPage).toContain('viewerRole={isOwner ? "owner" : "counterparty"}')
  })

  it("renders the signing controls and delegates writes to the guarded server action", () => {
    const reviewClient = readSource("app/contracts/[id]/contract-review-client.tsx")
    const workflowActions = readSource("app/lib/actions/contract-workflow.actions.ts")
    const signingMigration = readSource("supabase/migrations/20260328120000_artist_contracts_signing.sql")

    expect(reviewClient).toContain("signContractAction({")
    expect(reviewClient).toContain("Sign agreement")
    expect(reviewClient).toContain("signerRole: viewerRole")
    expect(workflowActions).toContain('.rpc("sign_artist_contract"')
    expect(signingMigration).toContain("if r.status <> 'sent' then")
    expect(signingMigration).toContain("auth.uid() <> r.user_id")
    expect(signingMigration).toContain("auth.uid() <> r.counterparty_user_id")
  })
})
