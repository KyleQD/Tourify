import csv
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("validate-simulation-coverage.py")
FIELDS = [
    "coverage_id", "persona", "goal_id", "goal", "platform", "scenario",
    "entry_route_hint", "receiving_actor", "owner_domain", "shipping_state", "status",
    "campaign_id", "deployed_sha", "actor_ids", "before_state", "after_state",
    "evidence", "receiver_evidence", "finding_id", "scope_decision_task", "scope_approver",
]


def run_ledger(rows, gate=False):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "coverage.csv"
        with path.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(rows)
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--ledger", str(path), *(["--gate"] if gate else [])],
            text=True, capture_output=True, check=False,
        )


def row(**overrides):
    baseline = {field: "" for field in FIELDS}
    baseline.update(
        coverage_id="ORG-01-WEB-SUCCESS", persona="organization_manager", goal_id="ORG-01",
        goal="Create event", platform="web", scenario="success", entry_route_hint="/events/create",
        receiving_actor="artist", owner_domain="organization", shipping_state="shipped",
        status="passed", campaign_id="SIM-20260922-01", deployed_sha="a" * 40,
        actor_ids="org-1", before_state="No campaign event", after_state="Event created",
        evidence="run-note#event", receiver_evidence="artist-run-note#event",
    )
    baseline.update(overrides)
    return baseline


class CoverageGateTests(unittest.TestCase):
    def test_complete_cross_actor_row_passes(self):
        result = run_ledger([row()], gate=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_bypass_and_unclassified_row_do_not_pass(self):
        result = run_ledger([row(shipping_state="needs_ui_confirmation", status="bypassed", finding_id="SIM-20260922-001")], gate=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("shipping state has no visible UI decision", result.stdout)

    def test_disabled_and_not_applicable_require_approved_scope(self):
        result = run_ledger([row(shipping_state="disabled", status="not_applicable", scope_decision_task="", scope_approver="")])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("owning task, and approver", result.stdout)

    def test_cross_actor_pass_requires_receiving_evidence(self):
        result = run_ledger([row(receiver_evidence="")], gate=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("receiving-side evidence", result.stdout)

    def test_rejects_duplicate_dimension_with_different_row_ids(self):
        result = run_ledger([row(), row(coverage_id="ANOTHER-ID")])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate persona, goal, platform, and scenario", result.stdout)


if __name__ == "__main__":
    unittest.main()
