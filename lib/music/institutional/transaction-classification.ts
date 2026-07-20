import type { InstitutionalTransactionPath } from "./institutional-domain"

export interface ResolveTransactionPathInput {
  transfersCopyrightOrContractRights: boolean
  grantsLicenseOnly: boolean
  transfersEntityInterest: boolean
  poolsInvestorCapital: boolean
  createsDebtEquityOrRevenueParticipation: boolean
  proposesTranchesOrCollateral: boolean
  approvedLegalPath?: InstitutionalTransactionPath
}

export interface TransactionPathResult {
  allowedToProceed: boolean
  path: InstitutionalTransactionPath
  reasons: string[]
}

export function resolveTransactionPath(
  input: ResolveTransactionPathInput,
): TransactionPathResult {
  if (!input.approvedLegalPath) {
    return {
      allowedToProceed: false,
      path: "blocked",
      reasons: ["approved_transaction_classification_required"],
    }
  }

  if (input.proposesTranchesOrCollateral && input.approvedLegalPath !== "structured_finance") {
    return {
      allowedToProceed: false,
      path: "blocked",
      reasons: ["structured_finance_review_required"],
    }
  }

  return { allowedToProceed: true, path: input.approvedLegalPath, reasons: [] }
}
