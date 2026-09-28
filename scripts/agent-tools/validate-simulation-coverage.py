#!/usr/bin/env python3
"""Validate QA-004's row-level inventory or its exact-SHA completion gate."""

import argparse
import csv
import re
from pathlib import Path


SHIPPING = {"needs_ui_confirmation", "shipped", "disabled", "unavailable"}
STATUS = {"not_run", "passed", "blocked", "bypassed", "not_applicable"}
PLATFORMS = {"web", "ios", "android"}
SHA = re.compile(r"^[0-9a-f]{40}$", re.I)
CAMPAIGN = re.compile(r"^SIM-\d{8}-[A-Z0-9]{2,12}$")


def validate(path: Path, gate: bool = False) -> tuple[list[str], dict[str, int]]:
    errors: list[str] = []
    counts = {"rows": 0, "shipped": 0, "passed": 0, "unclassified": 0}
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        required = {
            "coverage_id", "persona", "goal_id", "goal", "platform", "scenario",
            "entry_route_hint", "owner_domain", "shipping_state", "status",
            "campaign_id", "deployed_sha", "actor_ids", "before_state",
            "after_state", "evidence", "receiver_evidence", "finding_id",
            "scope_decision_task", "scope_approver",
        }
        missing = required - set(reader.fieldnames or [])
        if missing:
            return [f"missing columns: {', '.join(sorted(missing))}"], counts
        seen: set[str] = set()
        seen_dimensions: set[tuple[str, str, str, str]] = set()
        for number, row in enumerate(reader, 2):
            counts["rows"] += 1
            prefix = f"row {number} ({row['coverage_id'] or 'missing ID'})"
            if not all(row[field].strip() for field in ("coverage_id", "persona", "goal_id", "goal", "scenario", "owner_domain", "entry_route_hint")):
                errors.append(f"{prefix}: required inventory fields are empty")
            if row["coverage_id"] in seen:
                errors.append(f"{prefix}: duplicate coverage ID")
            seen.add(row["coverage_id"])
            dimensions = (row["persona"], row["goal_id"], row["platform"], row["scenario"])
            if dimensions in seen_dimensions:
                errors.append(f"{prefix}: duplicate persona, goal, platform, and scenario")
            seen_dimensions.add(dimensions)
            if row["platform"] not in PLATFORMS:
                errors.append(f"{prefix}: invalid platform")
            if row["shipping_state"] not in SHIPPING:
                errors.append(f"{prefix}: invalid shipping state")
            if row["status"] not in STATUS:
                errors.append(f"{prefix}: invalid result status")

            if row["shipping_state"] == "needs_ui_confirmation":
                counts["unclassified"] += 1
                if gate:
                    errors.append(f"{prefix}: shipping state has no visible UI decision")
            if row["shipping_state"] == "shipped":
                counts["shipped"] += 1
            if row["shipping_state"] == "disabled":
                if not all(row[field].strip() for field in ("evidence", "scope_decision_task", "scope_approver")):
                    errors.append(f"{prefix}: disabled action needs evidence, owning task, and approver")
                if row["status"] != "not_applicable":
                    errors.append(f"{prefix}: disabled action must be marked not_applicable")
            if row["shipping_state"] == "unavailable" and gate:
                errors.append(f"{prefix}: unavailable action is unresolved")

            if row["status"] == "not_applicable" and not all(row[field].strip() for field in ("evidence", "scope_decision_task", "scope_approver")):
                errors.append(f"{prefix}: not_applicable needs evidence, owning task, and approver")
            if row["status"] in {"passed", "blocked", "bypassed"}:
                for field in ("campaign_id", "deployed_sha", "actor_ids", "before_state", "after_state", "evidence"):
                    if not row[field].strip():
                        errors.append(f"{prefix}: attempted row is missing {field}")
                if row["campaign_id"] and not CAMPAIGN.fullmatch(row["campaign_id"]):
                    errors.append(f"{prefix}: invalid campaign ID")
                if row["deployed_sha"] and not SHA.fullmatch(row["deployed_sha"]):
                    errors.append(f"{prefix}: deployed SHA must be 40 hex characters")
                if row["status"] in {"blocked", "bypassed"} and not row["finding_id"].strip():
                    errors.append(f"{prefix}: blocked or bypassed row needs a finding")
                if row["status"] == "passed":
                    counts["passed"] += 1
                    if row["scenario"] in {"success", "cross_actor_handoff"} and row["receiving_actor"] not in {"", "same actor", row["persona"]} and not row["receiver_evidence"].strip():
                        errors.append(f"{prefix}: cross-actor pass needs receiving-side evidence")
            if gate and row["shipping_state"] == "shipped" and row["status"] not in {"passed", "not_applicable"}:
                errors.append(f"{prefix}: shipped scenario has not passed")
    if gate and counts["shipped"] == 0:
        errors.append("no shipped journeys were classified")
    return errors, counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", type=Path, default=Path("docs/audits/flow-notes/agent-user-simulation-coverage.csv"))
    parser.add_argument("--gate", action="store_true", help="require all shipped scenarios to pass")
    args = parser.parse_args()
    try:
        errors, counts = validate(args.ledger, args.gate)
    except (OSError, csv.Error) as error:
        print(f"Could not read coverage ledger: {error}")
        return 2
    print(f"QA-004 coverage: {counts['rows']} rows, {counts['shipped']} shipped, {counts['passed']} passed, {counts['unclassified']} awaiting UI classification")
    if errors:
        for error in errors[:50]:
            print(f"- {error}")
        if len(errors) > 50:
            print(f"- ... and {len(errors) - 50} more issues")
        return 1
    print("Coverage ledger valid" if not args.gate else "Coverage completion gate passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
