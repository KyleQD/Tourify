# Phase 5 Scope, Dependencies, and Boundaries

## Mission

Phase 5 turns the Phase 1–4 music, Rights Passport, royalty, valuation, offering, and restricted-transfer infrastructure into an **institutional catalog-capital platform**. It supports professional buyers, labels, publishers, rights administrators, family offices, funds, advisers, broker-dealers, transfer agents, fund administrators, custodians, banks, and approved data providers.

Phase 5 is not permissionless finance. It is a controlled workflow and data layer for institutional catalog transactions and partner-operated investment products.

## Required dependencies

Phase 5 may begin only after repository evidence confirms:

- `artist_music` remains the canonical catalog record and playback is unchanged;
- Phase 2 has versioned Rights Passports, dispute status, and rights-scope snapshots;
- Phase 3 has reconciled royalty history, source provenance, allocation snapshots, and valuation governance;
- Phase 4 has partner role mapping, immutable disclosure versions, investor eligibility, official position synchronization, transfer restrictions, settlement reconciliation, and surveillance controls;
- no critical RLS, financial-control, privacy, custody, or partner-reconciliation issue remains open.

## Product boundaries

Phase 5 includes:

- institutional organization profiles and delegated authority;
- direct catalog sale, assignment, and license transaction workspaces;
- institutional private-offering and fund/SPV workflows through approved partners;
- catalog data rooms, diligence requests, findings, and red-flag resolution;
- underwriting, investment-committee, portfolio-risk, and valuation governance;
- indications of interest, controlled bids, auctions, tenders, and negotiated transactions;
- capital commitments, calls, fund administration, NAV imports, waterfalls, and LP reporting;
- controlled institutional secondaries and multi-venue execution-quality evidence;
- institutional API/export surfaces and partner adapters;
- optional synchronized tokenized records where the official recordkeeper and regulated partners approve.

Phase 5 excludes by default:

- Tourify acting as an investment adviser, broker-dealer, ATS, exchange, transfer agent, custodian, escrow agent, fund administrator, tax preparer, or bank;
- Tourify exercising discretion over institutional portfolios or funds;
- Tourify matching securities orders without a registered intermediary and approved venue;
- anonymous institutions, anonymous wallets, bearer instruments, permissionless transfers, leverage, derivatives, rehypothecation, cross-chain bridges, or automated market making;
- representing a catalog estimate as a guaranteed price, NAV, fairness opinion, appraisal, or investment recommendation;
- direct movement or custody of investor cash or securities by Tourify.

## Core architectural rule

> Rights records define the underlying music interests. Legal transaction documents define what is sold or issued. Approved recordkeepers and regulated partners control ownership, custody, execution, and settlement. Tourify provides the verified catalog data, workflow, analytics, evidence, and synchronized user experience.
