# Cash Waterfalls, Distributions, and Servicing

## Cash-control boundary

Tourify never holds or transmits institutional cash. Banks, administrators, custodians, trustees, paying agents, or approved payment providers control funds.

## Servicing inputs

A servicing layer can reconcile:

- DSP, distributor, publisher, administrator, PRO/CMO, MLC, SoundExchange, direct-license, sync, neighboring-rights, and settlement receipts;
- ownership and servicing periods;
- reserves, recoupment, fees, taxes, FX, chargebacks, and adjustments;
- seller/buyer or vehicle allocations;
- payment instructions and confirmation references.

## Waterfall engine

Tourify may produce a parallel calculation for transparency and exception detection. The official administrator calculation controls.

Waterfall definitions require versioned rules for:

- return of capital;
- preferred return/hurdle;
- catch-up;
- carried interest/promote;
- management fees and expenses;
- reserves;
- clawback inputs;
- tax distributions;
- share-class or side-letter differences.

Use integer/rational math, explicit currency, deterministic rounding, and reproducible calculation traces.

## Distribution workflow

1. Import official distribution proposal.
2. Reconcile available cash and royalty receipts.
3. Compare official and Tourify parallel calculations.
4. Resolve exceptions.
5. Obtain required approvals.
6. Receive bank/admin payment confirmation.
7. Synchronize investor statements and portfolio cash flows.
8. Preserve adjustments through compensating records.
