# Valuation Governance, Appraisals, and Model Risk

## Valuation hierarchy

The UI must distinguish:

1. Phase 3 Tourify analytical range;
2. buyer underwriting value;
3. seller reserve or asking value;
4. third-party appraisal or valuation opinion;
5. transaction price;
6. fund administrator or governing-body approved NAV input;
7. observable secondary-market execution.

These are not interchangeable.

## Governance controls

- approved models and use cases;
- owner, validator, and approver separation;
- documented assumptions and data lineage;
- reproducible results;
- backtesting and forecast-versus-actual review;
- override rationale and approvals;
- stale-data and low-confidence flags;
- model change control;
- independent review for high-impact transactions;
- fair-value/NAV responsibilities assigned to the legally responsible party.

## Appraisals and opinions

Tourify can host and reference third-party appraisals, valuation opinions, fairness opinions, or audit work products. It must not label its own estimate as one of those regulated/professional outputs.

## Transaction feedback

Closed transaction data may improve model calibration only when confidentiality, data-use rights, conflicts, and leakage controls permit. Training data must be de-identified and access controlled.

## Model risk

Model output cannot automatically approve a deal, set an offering price, call capital, execute an order, or alter official NAV.
