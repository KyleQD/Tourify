"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { signContractAction } from "@/app/lib/actions/contract-workflow.actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dashboardCreatePattern } from "@/components/dashboard/dashboard-create-pattern"
import { cn } from "@/lib/utils"
import { CheckCircle, FileText } from "lucide-react"
import type { ContractReviewRow } from "./contract-review-types"

interface ContractReviewClientProps {
  contract: ContractReviewRow
  viewerRole: "owner" | "counterparty"
}

export function ContractReviewClient({ contract, viewerRole }: ContractReviewClientProps) {
  const [legalName, setLegalName] = useState("")
  const [hasAcknowledged, setHasAcknowledged] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const metadata = contract.metadata ?? {}
  const signatures = metadata.signatures ?? {}
  const myRoleKey = viewerRole
  const mySignature = signatures[myRoleKey]
  const otherRoleKey = viewerRole === "owner" ? "counterparty" : "owner"
  const otherSignature = signatures[otherRoleKey]

  const isDraft = contract.status === "draft"
  const isSent = contract.status === "sent"
  const isFullySigned = contract.status === "signed"

  async function handleSign() {
    if (!hasAcknowledged) {
      toast.error("Confirm that you accept the terms before signing")
      return
    }
    if (legalName.trim().length < 2) {
      toast.error("Enter your full legal name")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await signContractAction({
        contractId: contract.id,
        signerRole: viewerRole,
        legalName: legalName.trim(),
      })
      if (!res?.data?.success) {
        toast.error(
          (res?.data as { error?: string })?.error ||
            (res as { serverError?: string })?.serverError ||
            "Could not record signature"
        )
        return
      }
      toast.success("Signature recorded")
      window.location.reload()
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatSignedAt(raw: string | undefined) {
    if (!raw) return ""
    try {
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return raw
      return d.toLocaleString()
    } catch {
      return raw
    }
  }

  return (
    <div className="min-h-[70vh] max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className={cn(dashboardCreatePattern.shell, "space-y-2")}>
        <div className="flex items-center gap-3">
          <div className={dashboardCreatePattern.headerIcon}>
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{contract.title}</h1>
            <p className={dashboardCreatePattern.subtleText}>
              {viewerRole === "owner" ? "You are the artist / sender" : "You are the counterparty"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Not legal advice. This in-app acknowledgment records your agreement in Tourify; it is not a substitute for
        legal counsel or a formal e-signature platform. When this agreement is fully signed, both parties receive a
        confirmation email. If you have not signed yet, you may also get polite email reminders.
      </p>

      {isDraft && (
        <div className={cn(dashboardCreatePattern.panel, "border-amber-500/25 bg-amber-500/5 text-sm text-amber-100/90")}>
          {viewerRole === "owner" ? (
            <>
              This contract is still a <strong>draft</strong>. Send it for signature from{" "}
              <Link href="/artist/business/contracts" className="underline text-white">
                Contracts & Legal
              </Link>{" "}
              when you are ready; signing opens after it is sent.
            </>
          ) : (
            <>This agreement has not been sent yet. Ask the artist to send it when they are ready.</>
          )}
        </div>
      )}

      <div className={cn(dashboardCreatePattern.panel, "space-y-3")}>
        <h2 className="text-sm font-medium text-white">Terms</h2>
        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-[50vh] overflow-y-auto">
          {contract.terms?.trim() || "No terms on file."}
        </pre>
      </div>

      {isFullySigned && (
        <div
          className={cn(
            dashboardCreatePattern.panel,
            "flex items-start gap-3 border-emerald-500/30 bg-emerald-500/5"
          )}
        >
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-medium">Fully signed</p>
            <p className="text-sm text-slate-400 mt-1">
              Both parties have recorded their acknowledgment on this contract.
            </p>
          </div>
        </div>
      )}

      <div className={cn(dashboardCreatePattern.panel, "space-y-4 text-sm")}>
        <p className="text-slate-300 font-medium">Signature status</p>
        <ul className="space-y-2 text-slate-400">
          <li>
            Artist / owner:{" "}
            {signatures.owner ? (
              <span className="text-emerald-300">
                {signatures.owner.legal_name} — {formatSignedAt(signatures.owner.signed_at)}
              </span>
            ) : (
              <span className="text-slate-500">Pending</span>
            )}
          </li>
          <li>
            Counterparty:{" "}
            {signatures.counterparty ? (
              <span className="text-emerald-300">
                {signatures.counterparty.legal_name} — {formatSignedAt(signatures.counterparty.signed_at)}
              </span>
            ) : (
              <span className="text-slate-500">Pending</span>
            )}
          </li>
        </ul>
      </div>

      {isSent && !mySignature && (
        <div className={cn(dashboardCreatePattern.panel, "space-y-4")}>
          <p className="text-sm text-slate-300">Sign to acknowledge you accept the terms as written.</p>
          <div className="flex items-start gap-3">
            <Checkbox
              id="ack"
              checked={hasAcknowledged}
              onCheckedChange={(v) => setHasAcknowledged(v === true)}
              className="mt-1 border-slate-600"
            />
            <Label htmlFor="ack" className="text-sm text-slate-300 leading-snug cursor-pointer">
              I have read this agreement and acknowledge it accurately reflects what we discussed. I understand this
              is not legal advice.
            </Label>
          </div>
          <div className={dashboardCreatePattern.fieldGroup}>
            <Label className="text-slate-300">Full legal name</Label>
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className={dashboardCreatePattern.input}
              placeholder="As it should appear on the record"
            />
          </div>
          <Button
            type="button"
            onClick={handleSign}
            disabled={isSubmitting}
            className={dashboardCreatePattern.btnPrimary}
          >
            {isSubmitting ? "Submitting…" : "Sign agreement"}
          </Button>
        </div>
      )}

      {isSent && mySignature && !isFullySigned && (
        <p className="text-sm text-slate-400">
          You signed on {formatSignedAt(mySignature.signed_at)}. Waiting for the{" "}
          {otherRoleKey === "owner" ? "artist" : "counterparty"} to sign.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className={dashboardCreatePattern.btnOutline}>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
        {viewerRole === "owner" && (
          <Button asChild variant="outline" className={dashboardCreatePattern.btnOutline}>
            <Link href="/artist/business/contracts">Artist contracts</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
