# Organization Ticketing UX Specification

## Organization dashboard

The dashboard is an organization portfolio, not an event editor. It shows truthful metric states, event lifecycle/readiness, source freshness, filters, and actionable operational alerts. Selecting an event navigates to its workspace.

Customer UI never shows cutover modes, dual-read totals, table names, migration instructions, or feature-flag guidance.

## Event workspace information architecture

The workspace contains exactly seven top-level tabs:

1. Overview
2. Inventory & Pricing
3. Orders & Attendees
4. Admissions & Access
5. Promotions & Distribution
6. Analytics
7. Settings

Refunds are operations inside Orders & Attendees. Guest lists, comps, staff/crew credentials, lookup, scanning, re-entry, and history remain distinct admission kinds inside Admissions & Access.

## State presentation

Lifecycle and problem state are separate. A payment or inventory problem does not erase the event lifecycle. Loading, empty, unavailable, permission-denied, error, and stale states are distinct. A displayed zero exists only when the API reports an available metric with value zero.

## Navigation and accessibility

The `org` and `tab` values are URL-synchronized. The shell displays organization/event identity, breadcrumbs, readiness, and a dashboard return path. Controls are keyboard reachable, focus-visible, screen-reader labeled, responsive, and suitable for event-day mobile use.

