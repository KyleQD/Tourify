"use client"

import { useMemo, useState } from "react"
import { Copy, ExternalLink, Loader2, Send } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringCandidate } from "@/types/hiring-candidate-workflow"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringTemplateListItem } from "@/types/hiring-dashboard"
import { OnboardingDeliveryBadge } from "@/components/hiring/candidate-card/onboarding-delivery-badge"
import { WorkforcePanel } from "@/components/hiring/workforce-ui"

interface CandidateOnboardingPanelProps {
  candidate: HiringCandidate
  employer: HiringEntity
  onUpdated: () => void
}

export function CandidateOnboardingPanel({ candidate, employer, onUpdated }: CandidateOnboardingPanelProps) {
  const { toast } = useToast()
  const employerQuery = getEmployerQueryString(employer)

  const { data: templates, isLoading: isLoadingTemplates } = useHiringDashboardFetch<HiringTemplateListItem[]>({
    url: `/api/admin/onboarding/templates?${employerQuery}`,
    initialData: [],
  })

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(candidate.template?.id ?? "")
  const [isSending, setIsSending] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  )

  const hasSentInvite = (candidate.onboardingDeliveryStatus ?? "not_sent") !== "not_sent"
  const isPending = (candidate.templateState ?? "pending") === "pending"

  async function assignAndSend() {
    if (!selectedTemplateId) {
      toast({ title: "Select a template", description: "Choose an onboarding template to send.", variant: "destructive" })
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(`/api/hiring/candidates/${candidate.id}/onboarding?${employerQuery}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: selectedTemplateId, send_notification: true }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Failed to assign onboarding template")

      toast({
        title: "Onboarding sent",
        description: payload?.data?.notificationSent
          ? "The applicant was notified in their account."
          : "Template assigned. The applicant has no linked account yet, so share the link manually.",
      })
      onUpdated()
    } catch (error) {
      toast({
        title: "Could not send onboarding",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  async function resendNotification() {
    setIsResending(true)
    try {
      const response = await fetch(`/api/hiring/candidates/${candidate.id}/onboarding?${employerQuery}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send_notification: true, is_resend: true }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Failed to resend onboarding")

      toast({
        title: "Reminder sent",
        description: payload?.data?.notificationSent
          ? "A reminder was delivered to the applicant's account."
          : "No linked account yet — share the onboarding link manually.",
      })
      onUpdated()
    } catch (error) {
      toast({
        title: "Could not resend",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  async function copyInviteLink() {
    if (!candidate.onboardingUrl) return
    try {
      const absolute = new URL(candidate.onboardingUrl, window.location.origin).toString()
      await navigator.clipboard.writeText(absolute)
      toast({ title: "Invite link copied" })
    } catch {
      toast({ title: "Copy failed", variant: "destructive" })
    }
  }

  return (
    <WorkforcePanel className="space-y-4 p-5">
      <div className="flex flex-row items-center justify-between gap-2">
        <h3 className="text-base font-medium text-white">Onboarding</h3>
        <OnboardingDeliveryBadge status={candidate.onboardingDeliveryStatus} />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Onboarding template</label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isLoadingTemplates}>
            <SelectTrigger>
              <SelectValue placeholder={isLoadingTemplates ? "Loading templates…" : "Select a template"} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                  {template.isDefault ? " (Default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isPending ? (
            <p className="text-xs text-amber-300">
              No template assigned yet. Pick one and send it so the applicant can start onboarding.
            </p>
          ) : null}
        </div>

        {selectedTemplate ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-white">{selectedTemplate.name}</span>
              {selectedTemplate.scope === "global" ? <Badge variant="secondary">Starter</Badge> : null}
            </div>
            {selectedTemplate.description ? (
              <p className="mt-1 text-slate-400">{selectedTemplate.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>{selectedTemplate.fieldCount ?? 0} fields</span>
              <span>{selectedTemplate.requiredDocuments?.length ?? 0} required docs</span>
              <span>{selectedTemplate.agreementCount ?? 0} agreements</span>
              {selectedTemplate.estimatedDays ? <span>~{selectedTemplate.estimatedDays} days</span> : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void assignAndSend()}
            disabled={isSending || !selectedTemplateId}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-700 hover:to-cyan-700"
          >
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {hasSentInvite ? "Update & resend onboarding" : "Assign & send onboarding"}
          </Button>
          {hasSentInvite ? (
            <Button
              variant="outline"
              onClick={() => void resendNotification()}
              disabled={isResending}
              className="border-slate-700/60 bg-slate-900/50 hover:border-cyan-400/40"
            >
              {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Resend notification
            </Button>
          ) : null}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="admin-tools" className="border-slate-700/60">
            <AccordionTrigger className="text-sm text-slate-400">Admin tools</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p className="text-slate-400">
                Invitation ID: {candidate.invitationId ?? "—"} · Token: {candidate.invitationToken ? "present" : "none"}
              </p>
              {candidate.onboardingUrl ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild className="border-slate-700/60 bg-slate-900/50 hover:border-cyan-400/40">
                    <a href={candidate.onboardingUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open worker invite
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void copyInviteLink()} className="border-slate-700/60 bg-slate-900/50 hover:border-cyan-400/40">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy link
                  </Button>
                </div>
              ) : (
                <p className="text-slate-400">Send onboarding to generate an invite link.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </WorkforcePanel>
  )
}
