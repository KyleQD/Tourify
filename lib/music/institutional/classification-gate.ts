import type { InstitutionalTransactionPath } from "./institutional-domain"
import { resolveTransactionPath } from "./transaction-classification"

export interface ClassificationGateInput {
  classificationStatus: string
  approvedPath?: InstitutionalTransactionPath | null
  action: "bid" | "subscription" | "closing" | "tokenization" | "auction" | "ioi"
  planningFacts?: {
    transfersCopyrightOrContractRights?: boolean
    grantsLicenseOnly?: boolean
    transfersEntityInterest?: boolean
    poolsInvestorCapital?: boolean
    createsDebtEquityOrRevenueParticipation?: boolean
    proposesTranchesOrCollateral?: boolean
  }
}

export function assertClassificationAllowsAction(input: ClassificationGateInput): {
  allowed: boolean
  reason?: string
  path?: InstitutionalTransactionPath
} {
  if (input.classificationStatus !== "approved" || !input.approvedPath)
    return { allowed: false, reason: "approved_transaction_classification_required" }

  if (input.approvedPath === "blocked" || input.approvedPath === "readiness_only")
    return { allowed: false, reason: "path_not_transactional", path: input.approvedPath }

  if (
    (input.action === "bid" || input.action === "auction") &&
    (input.approvedPath === "private_security" || input.approvedPath === "fund_interest")
  )
    return {
      allowed: false,
      reason: "securities_path_requires_phase4_partner_intermediary",
      path: input.approvedPath,
    }

  if (input.action === "tokenization" && input.approvedPath === "structured_finance")
    return { allowed: false, reason: "structured_finance_tokenization_requires_separate_approval" }

  const resolved = resolveTransactionPath({
    transfersCopyrightOrContractRights: Boolean(input.planningFacts?.transfersCopyrightOrContractRights),
    grantsLicenseOnly: Boolean(input.planningFacts?.grantsLicenseOnly),
    transfersEntityInterest: Boolean(input.planningFacts?.transfersEntityInterest),
    poolsInvestorCapital: Boolean(input.planningFacts?.poolsInvestorCapital),
    createsDebtEquityOrRevenueParticipation: Boolean(
      input.planningFacts?.createsDebtEquityOrRevenueParticipation,
    ),
    proposesTranchesOrCollateral: Boolean(input.planningFacts?.proposesTranchesOrCollateral),
    approvedLegalPath: input.approvedPath,
  })

  if (!resolved.allowedToProceed)
    return { allowed: false, reason: resolved.reasons[0] || "classification_blocked", path: resolved.path }

  return { allowed: true, path: resolved.path }
}

export const INSTITUTIONAL_DISCLAIMER =
  "No value, yield, liquidity, ownership, or legal-compliance outcome is guaranteed. Official ownership, NAV, custody, and settlement are controlled by approved partners and recordkeepers."
