# Fund Administration, NAV, and Partnership Accounting

## Source of truth

The appointed fund administrator or approved accounting system is the official source for:

- capital accounts;
- commitments and contributions;
- expenses and fees;
- realized and unrealized gains/losses;
- NAV and share/unit values;
- allocations and waterfalls;
- investor statements;
- tax allocations and documents.

Tourify stores synchronized read models and reconciliation evidence.

## NAV periods

Each NAV period should contain:

- valuation date and reporting period;
- official administrator version;
- portfolio holdings and ownership percentages;
- cash, receivables, payables, reserves, and accrued expenses;
- catalog valuation inputs and approved overrides;
- FX rates and sources;
- fee and carry calculations;
- exception and approval status;
- delivery and restatement history.

## Reconciliation

Reconcile:

- Phase 3 royalty ledger to administrator cash and receivables;
- Phase 4 official securityholder/position records to administrator ownership;
- Phase 5 catalog assets to fund holdings;
- distributions and capital calls to bank/admin records;
- valuation models to approved NAV inputs.

## Restatements

Never overwrite a finalized NAV. A restatement creates a new version, reason, impact analysis, approvals, investor notification status, and downstream correction jobs.

## Side letters and allocations

Model side-letter obligations and special terms as restricted tags and provider-controlled calculations. Do not expose one investor’s confidential terms to another investor.
