#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { FileBlob, SpreadsheetFile, Workbook } = require("@oai/artifact-tool");

// realpath keeps repository discovery correct when the script is invoked through a
// temporary symlink used to expose the bundled artifact-tool dependency.
const SCRIPT_FILE = await fs.realpath(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(SCRIPT_FILE), "../..");
const AUDIT_ROOT = path.join(ROOT, "docs/admin-audit");
const REGISTRY_ROOT = path.join(AUDIT_ROOT, "registry");
const EVIDENCE_ROOT = path.join(AUDIT_ROOT, "evidence");
const GENERATED_ROOT = path.join(AUDIT_ROOT, "generated");
const COVERAGE = path.join(GENERATED_ROOT, "coverage.json");
const OUTPUT = path.join(
  GENERATED_ROOT,
  "TOURIFY_ADMIN_WORKFLOW_TRACKER.xlsx",
);
const MANIFEST = path.join(GENERATED_ROOT, "workbook-manifest.json");
const SERVICE_ROLE_REVIEW = path.join(
  ROOT,
  "lib/supabase/service-role-import-review.json",
);
const ADMIN_ROUTE_REGISTRY = path.join(ROOT, "lib/admin/api-route-registry.ts");
const ADMIN_ROUTE_BASELINE = path.join(
  ROOT,
  "scripts/ci/admin-route-registry-baseline.json",
);

const COLORS = {
  ink: "#172033",
  inkMuted: "#334155",
  white: "#FFFFFF",
  line: "#D8E0EA",
  blue: "#2563EB",
  blueSoft: "#DBEAFE",
  purple: "#7C3AED",
  purpleSoft: "#EDE9FE",
  green: "#15803D",
  greenSoft: "#DCFCE7",
  amber: "#B45309",
  amberSoft: "#FEF3C7",
  orange: "#C2410C",
  orangeSoft: "#FFEDD5",
  red: "#B91C1C",
  redSoft: "#FEE2E2",
  slateSoft: "#F1F5F9",
};

const STATUS_RULES = [
  ["done", COLORS.greenSoft, COLORS.green],
  ["implemented", COLORS.greenSoft, COLORS.green],
  ["ready_for_independent_verification", COLORS.blueSoft, "#1D4ED8"],
  ["ready_for_staging", COLORS.purpleSoft, "#6D28D9"],
  ["in_progress", COLORS.amberSoft, COLORS.amber],
  ["reproduced", COLORS.orangeSoft, COLORS.orange],
  ["observed", COLORS.slateSoft, COLORS.inkMuted],
  ["not_verified", COLORS.redSoft, COLORS.red],
  ["evidence_complete", COLORS.greenSoft, COLORS.green],
];

const DATA_SHEETS = [
  "Execution Batches",
  "Findings",
  "Workflows",
  "Spec Tasks",
  "Launch Gates",
  "Risks",
  "Evidence",
  "Decisions",
  "Service Role Debt",
];

function optionValue(name) {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a path`);
  }
  return value;
}

function usage() {
  return [
    "Usage:",
    "  build-admin-audit-workbook.mjs [--render-dir <directory>]",
    "  build-admin-audit-workbook.mjs --inspect-existing [--render-dir <directory>]",
    "",
    `Workbook: ${path.relative(ROOT, OUTPUT)}`,
  ].join("\n");
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function walkJson(directory, output = []) {
  if (!existsSync(directory)) return output;
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkJson(fullPath, output);
    else if (entry.name.endsWith(".json")) output.push(fullPath);
  }
  return output;
}

// Keep these inputs byte-for-byte aligned with registrySourceHash() in
// scripts/audit/admin-workflow-registry.ts. Generated views are deliberately
// excluded, even though coverage.json is read below to populate dashboard data.
async function registrySourceHash() {
  const files = [
    ...(await walkJson(REGISTRY_ROOT)),
    ...(await walkJson(EVIDENCE_ROOT)),
    SERVICE_ROLE_REVIEW,
    ADMIN_ROUTE_REGISTRY,
    ADMIN_ROUTE_BASELINE,
  ]
    .filter(existsSync)
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(ROOT, file));
    hash.update("\0");
    hash.update(await fs.readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function list(values) {
  return Array.isArray(values) ? values.filter(Boolean).join("; ") : "";
}

function blockerIds(blockers) {
  return list((blockers ?? []).map((blocker) => blocker.blockerId));
}

function priorClaims(claims) {
  return list(
    (claims ?? []).map(
      (claim) =>
        `${claim.source}: ${claim.claimedStatus}${claim.note ? ` — ${claim.note}` : ""}`,
    ),
  );
}

function recoverySummary(recovery) {
  if (!recovery) return "";
  return [
    `Retry: ${recovery.retry}`,
    `Reversal: ${recovery.reversal}`,
    `Partial: ${recovery.partialFailure}`,
  ].join(" ");
}

function riskLevel(score) {
  if (score >= 20) return "Critical";
  if (score >= 12) return "High";
  if (score >= 6) return "Medium";
  return "Low";
}

function columnName(index) {
  let value = index + 1;
  let output = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }
  return output;
}

function addTextRule(range, text, fill, fontColor, bold = false) {
  range.conditionalFormats.add("containsText", {
    text,
    format: {
      fill,
      font: { color: fontColor, bold },
    },
  });
}

function addStatusRules(range) {
  for (const [text, fill, fontColor] of STATUS_RULES) {
    addTextRule(range, text, fill, fontColor, true);
  }
}

function setColumnWidths(sheet, lastRow, widths) {
  widths.forEach((width, index) => {
    sheet.getRange(`${columnName(index)}1:${columnName(index)}${lastRow}`).format.columnWidth =
      width;
  });
}

function addDataSheet(
  workbook,
  {
    name,
    tableName,
    headers,
    rows,
    widths,
    rowHeight = 34,
    freezeColumns = 1,
  },
) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  const lastColumn = columnName(headers.length - 1);
  const lastRow = rows.length + 1;
  const usedRange = sheet.getRange(`A1:${lastColumn}${lastRow}`);
  usedRange.values = [headers, ...rows];
  usedRange.format = {
    font: { name: "Aptos", size: 10, color: COLORS.ink },
    verticalAlignment: "top",
  };
  sheet.getRange(`A2:${lastColumn}${lastRow}`).format.wrapText = true;
  sheet.getRange(`A2:${lastColumn}${lastRow}`).format.rowHeight = rowHeight;
  sheet.getRange(`A1:${lastColumn}1`).format = {
    fill: COLORS.ink,
    font: { name: "Aptos", size: 10, color: COLORS.white, bold: true },
    verticalAlignment: "center",
    wrapText: true,
    rowHeight: 30,
    borders: { preset: "doubleBottom", style: "medium", color: COLORS.blue },
  };
  usedRange.format.borders = {
    insideHorizontal: { style: "thin", color: COLORS.line },
    bottom: { style: "thin", color: COLORS.line },
  };
  setColumnWidths(sheet, lastRow, widths);
  sheet.freezePanes.freezeRows(1);
  if (freezeColumns > 0) sheet.freezePanes.freezeColumns(freezeColumns);
  const table = sheet.tables.add(`A1:${lastColumn}${lastRow}`, true, tableName);
  table.style = "TableStyleMedium2";
  table.showHeaders = true;
  table.showFilterButton = true;
  return { sheet, lastColumn, lastRow, table };
}

function styleCard(sheet, labelRange, valueRange, accent, softFill) {
  labelRange.format = {
    fill: accent,
    font: { name: "Aptos", size: 10, color: COLORS.white, bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: accent },
  };
  valueRange.format = {
    fill: softFill,
    font: { name: "Aptos Display", size: 19, color: COLORS.ink, bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: accent },
  };
}

function styleSectionHeading(range) {
  range.format = {
    fill: COLORS.inkMuted,
    font: { name: "Aptos", size: 10, color: COLORS.white, bold: true },
    verticalAlignment: "center",
    rowHeight: 25,
  };
}

function addDashboardTable(sheet, address, name) {
  const table = sheet.tables.add(address, true, name);
  table.style = "TableStyleMedium2";
  table.showHeaders = true;
  table.showFilterButton = false;
  return table;
}

function populateDashboard(
  dashboard,
  {
    program,
    findings,
    workflows,
    tasks,
    gates,
    risks,
    evidence,
    serviceRoleReviews,
    sourceHash,
  },
) {
  dashboard.showGridLines = false;
  dashboard.freezePanes.freezeRows(13);
  dashboard.getRange("A1:J31").format = {
    font: { name: "Aptos", size: 10, color: COLORS.ink },
    verticalAlignment: "center",
  };

  dashboard.mergeCells("A1:J1");
  dashboard.getRange("A1").values = [[program.title]];
  dashboard.getRange("A1:J1").format = {
    fill: COLORS.ink,
    font: { name: "Aptos Display", size: 22, color: COLORS.white, bold: true },
    verticalAlignment: "center",
    rowHeight: 38,
  };
  dashboard.mergeCells("A2:J2");
  dashboard.getRange("A2").values = [[
    `Canonical registry v${program.registryVersion} • baseline ${program.baseline.branch}@${program.baseline.commit.slice(0, 12)} • source ${sourceHash.slice(0, 12)}`,
  ]];
  dashboard.getRange("A2:J2").format = {
    fill: COLORS.ink,
    font: { name: "Aptos", size: 10, color: "#CBD5E1", italic: true },
    verticalAlignment: "center",
    rowHeight: 24,
  };

  const cards = [
    ["A4:B4", "A5:B6", "Release posture", COLORS.purple, COLORS.purpleSoft],
    ["C4:D4", "C5:D6", "Total findings", COLORS.blue, COLORS.blueSoft],
    ["E4:F4", "E5:F6", "Open P0", COLORS.red, COLORS.redSoft],
    ["G4:H4", "G5:H6", "Open P1", COLORS.orange, COLORS.orangeSoft],
    ["I4:J4", "I5:J6", "Verified gates", COLORS.green, COLORS.greenSoft],
    ["A8:B8", "A9:B10", "Workflows", COLORS.blue, COLORS.blueSoft],
    ["C8:D8", "C9:D10", "Spec tasks", COLORS.purple, COLORS.purpleSoft],
    ["E8:F8", "E9:F10", "Passing evidence", COLORS.green, COLORS.greenSoft],
    ["G8:H8", "G9:H10", "Service-role debt", COLORS.amber, COLORS.amberSoft],
    ["I8:J8", "I9:J10", "Open risks", COLORS.red, COLORS.redSoft],
  ];
  for (const [labelAddress, valueAddress, label, accent, softFill] of cards) {
    dashboard.mergeCells(labelAddress);
    dashboard.mergeCells(valueAddress);
    dashboard.getRange(labelAddress.split(":")[0]).values = [[label]];
    styleCard(
      dashboard,
      dashboard.getRange(labelAddress),
      dashboard.getRange(valueAddress),
      accent,
      softFill,
    );
  }

  const findingLastRow = findings.length + 1;
  const workflowLastRow = workflows.length + 1;
  const taskLastRow = tasks.length + 1;
  const gateLastRow = gates.length + 1;
  const evidenceLastRow = evidence.length + 1;
  const debtLastRow = serviceRoleReviews.length + 1;
  const riskLastRow = risks.length + 1;
  dashboard.getRange("A5").formulas = [[
    `=IF(AND(E5=0,G5=0,I5=${gates.filter((gate) => gate.required).length}),"GO","NO-GO")`,
  ]];
  dashboard.getRange("C5").formulas = [[
    `=COUNTA('Findings'!$A$2:$A$${findingLastRow})`,
  ]];
  dashboard.getRange("E5").formulas = [[
    `=COUNTIFS('Findings'!$C$2:$C$${findingLastRow},"P0",'Findings'!$G$2:$G$${findingLastRow},"<>done")`,
  ]];
  dashboard.getRange("G5").formulas = [[
    `=COUNTIFS('Findings'!$C$2:$C$${findingLastRow},"P1",'Findings'!$G$2:$G$${findingLastRow},"<>done")`,
  ]];
  dashboard.getRange("I5").formulas = [[
    `=COUNTIF('Launch Gates'!$J$2:$J$${gateLastRow},"evidence_complete")`,
  ]];
  dashboard.getRange("A9").formulas = [[
    `=COUNTA('Workflows'!$A$2:$A$${workflowLastRow})`,
  ]];
  dashboard.getRange("C9").formulas = [[
    `=COUNTA('Spec Tasks'!$A$2:$A$${taskLastRow})`,
  ]];
  dashboard.getRange("E9").formulas = [[
    `=COUNTIF('Evidence'!$C$2:$C$${evidenceLastRow},"pass")`,
  ]];
  dashboard.getRange("G9").formulas = [[
    `=COUNTA('Service Role Debt'!$A$2:$A$${debtLastRow})`,
  ]];
  dashboard.getRange("I9").formulas = [[
    `=COUNTIF('Risks'!$G$2:$G$${riskLastRow},"open")`,
  ]];
  dashboard.getRange("A5").conditionalFormats.addCustom('=A5="NO-GO"', {
    fill: COLORS.redSoft,
    font: { color: COLORS.red, bold: true },
  });

  dashboard.mergeCells("A12:D12");
  dashboard.getRange("A12").values = [["Launch gate readiness"]];
  styleSectionHeading(dashboard.getRange("A12:D12"));
  dashboard.getRange("A13:D13").values = [[
    "Gate ID",
    "Title",
    "Evidence status",
    "Owner",
  ]];
  dashboard.getRange("A14").formulas = [["='Launch Gates'!A2"]];
  dashboard.getRange("A14:A31").fillDown();
  dashboard.getRange("B14").formulas = [["='Launch Gates'!B2"]];
  dashboard.getRange("B14:B31").fillDown();
  dashboard.getRange("C14").formulas = [["='Launch Gates'!J2"]];
  dashboard.getRange("C14:C31").fillDown();
  dashboard.getRange("D14").formulas = [["='Launch Gates'!I2"]];
  dashboard.getRange("D14:D31").fillDown();
  addDashboardTable(dashboard, "A13:D31", "DashboardGateSummary");
  addStatusRules(dashboard.getRange("C14:C31"));

  dashboard.mergeCells("F12:G12");
  dashboard.getRange("F12").values = [["Finding status"]];
  styleSectionHeading(dashboard.getRange("F12:G12"));
  dashboard.getRange("F13:G13").values = [["Status", "Count"]];
  dashboard.getRange("F14:F20").values = program.statusOrder.map((status) => [status]);
  dashboard.getRange("G14").formulas = [[
    `=COUNTIF('Findings'!$G$2:$G$${findingLastRow},F14)`,
  ]];
  dashboard.getRange("G14:G20").fillDown();
  addDashboardTable(dashboard, "F13:G20", "DashboardFindingStatus");
  addStatusRules(dashboard.getRange("F14:F20"));

  dashboard.mergeCells("F22:G22");
  dashboard.getRange("F22").values = [["Workflow status"]];
  styleSectionHeading(dashboard.getRange("F22:G22"));
  dashboard.getRange("F23:G23").values = [["Status", "Count"]];
  dashboard.getRange("F24:F30").values = program.statusOrder.map((status) => [status]);
  dashboard.getRange("G24").formulas = [[
    `=COUNTIF('Workflows'!$F$2:$F$${workflowLastRow},F24)`,
  ]];
  dashboard.getRange("G24:G30").fillDown();
  addDashboardTable(dashboard, "F23:G30", "DashboardWorkflowStatus");
  addStatusRules(dashboard.getRange("F24:F30"));

  dashboard.mergeCells("I12:J12");
  dashboard.getRange("I12").values = [["Priority mix"]];
  styleSectionHeading(dashboard.getRange("I12:J12"));
  dashboard.getRange("I13:J13").values = [["Priority", "Count"]];
  dashboard.getRange("I14:I17").values = [["P0"], ["P1"], ["P2"], ["P3"]];
  dashboard.getRange("J14").formulas = [[
    `=COUNTIF('Findings'!$C$2:$C$${findingLastRow},I14)`,
  ]];
  dashboard.getRange("J14:J17").fillDown();
  addDashboardTable(dashboard, "I13:J17", "DashboardPriorityMix");
  addTextRule(dashboard.getRange("I14:I17"), "P0", COLORS.redSoft, COLORS.red, true);
  addTextRule(dashboard.getRange("I14:I17"), "P1", COLORS.orangeSoft, COLORS.orange, true);
  addTextRule(dashboard.getRange("I14:I17"), "P2", COLORS.amberSoft, COLORS.amber, true);
  addTextRule(dashboard.getRange("I14:I17"), "P3", COLORS.slateSoft, COLORS.inkMuted, true);

  dashboard.mergeCells("I19:J19");
  dashboard.getRange("I19").values = [["Service-role disposition"]];
  styleSectionHeading(dashboard.getRange("I19:J19"));
  dashboard.getRange("I20:J20").values = [["Disposition", "Count"]];
  dashboard.getRange("I21:I24").values = [
    ["migrate_to_job"],
    ["replace_with_user_rls"],
    ["replace_with_rpc"],
    ["retire"],
  ];
  dashboard.getRange("J21").formulas = [[
    `=COUNTIF('Service Role Debt'!$B$2:$B$${debtLastRow},I21)`,
  ]];
  dashboard.getRange("J21:J24").fillDown();
  addDashboardTable(dashboard, "I20:J24", "DashboardServiceRoleDisposition");

  dashboard.getRange("A13:J31").format.verticalAlignment = "top";
  dashboard.getRange("A14:D31").format.rowHeight = 25;
  dashboard.getRange("B14:B31").format.wrapText = true;
  setColumnWidths(dashboard, 31, [13, 38, 22, 22, 3, 36, 12, 3, 29, 12]);
}

async function loadInputs() {
  const evidenceFiles = (await walkJson(EVIDENCE_ROOT)).sort();
  const sourceHash = await registrySourceHash();
  const [
    program,
    findings,
    workflows,
    tasks,
    gates,
    risks,
    decisions,
    evidence,
    serviceRoleReviews,
    coverage,
    executionBatches,
  ] = await Promise.all([
    readJson(path.join(REGISTRY_ROOT, "program.json")),
    readJson(path.join(REGISTRY_ROOT, "findings.json")),
    readJson(path.join(REGISTRY_ROOT, "workflows.json")),
    readJson(path.join(REGISTRY_ROOT, "spec-tasks.json")),
    readJson(path.join(REGISTRY_ROOT, "launch-gates.json")),
    readJson(path.join(REGISTRY_ROOT, "risks.json")),
    readJson(path.join(REGISTRY_ROOT, "decisions.json")),
    Promise.all(evidenceFiles.map(readJson)),
    readJson(SERVICE_ROLE_REVIEW),
    readJson(COVERAGE),
    readJson(path.join(REGISTRY_ROOT, "execution-batches.json")),
  ]);
  if (coverage.registrySourceSha256 !== sourceHash) {
    throw new Error(
      `coverage.json is stale: expected registrySourceSha256 ${sourceHash}, found ${coverage.registrySourceSha256}`,
    );
  }
  return {
    program,
    findings,
    workflows,
    tasks,
    gates,
    risks,
    decisions,
    evidence: evidence.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
    serviceRoleReviews,
    coverage,
    executionBatches: await Promise.all(
      executionBatches.map(async (batch) => ({
        ...batch,
        derivedStatus: (
          await readJson(
            path.join(GENERATED_ROOT, "context", `${batch.batchId}.json`),
          )
        ).derivedStatus,
      })),
    ),
    sourceHash,
  };
}

function buildWorkbook(inputs) {
  const {
    program,
    findings,
    workflows,
    tasks,
    gates,
    risks,
    decisions,
    evidence,
    serviceRoleReviews,
    coverage,
    executionBatches,
    sourceHash,
  } = inputs;
  const workbook = Workbook.create();
  const dashboard = workbook.worksheets.add("Dashboard");

  const batchesSheet = addDataSheet(workbook, {
    name: "Execution Batches",
    tableName: "AdminExecutionBatches",
    headers: [
      "Batch ID", "Order", "Title", "Derived status", "Exit status",
      "Dependencies", "Completion workflows", "Primary findings",
      "Task selectors", "Target paths", "Launch gates", "Exit criteria",
    ],
    rows: executionBatches.map((item) => [
      item.batchId, item.order, item.title, item.derivedStatus, item.exitStatus,
      list(item.dependsOn), list(item.completionWorkflowIds),
      list(item.primaryFindingIds),
      list([...(item.specTaskPatterns ?? []), ...(item.specTaskIds ?? [])]),
      list(item.targetPaths), list(item.gateIds), list(item.exitCriteria),
    ]),
    widths: [14, 9, 36, 30, 30, 24, 27, 40, 44, 54, 24, 68],
    rowHeight: 52,
  });
  batchesSheet.sheet.getRange(`B2:B${batchesSheet.lastRow}`).format.numberFormat = "0";
  addStatusRules(batchesSheet.sheet.getRange(`D2:E${batchesSheet.lastRow}`));

  const findingsSheet = addDataSheet(workbook, {
    name: "Findings",
    tableName: "AuditFindings",
    headers: [
      "Finding ID", "Kind", "Priority", "State", "Domain", "Wave", "Status",
      "Title", "Solution", "Workflows", "Owner", "Blockers", "Evidence",
    ],
    rows: findings.map((item) => [
      item.findingId, item.findingKind, item.priority, item.state, item.domain,
      item.deliveryWave, item.status, item.title, item.solution, list(item.workflowIds),
      item.owner, blockerIds(item.blockers), list(item.evidenceIds),
    ]),
    widths: [15, 21, 10, 18, 24, 8, 30, 46, 48, 25, 22, 20, 34],
    rowHeight: 43,
  });
  findingsSheet.sheet.getRange(`F2:F${findingsSheet.lastRow}`).format.numberFormat = "0";
  addStatusRules(findingsSheet.sheet.getRange(`G2:G${findingsSheet.lastRow}`));
  addTextRule(findingsSheet.sheet.getRange(`C2:C${findingsSheet.lastRow}`), "P0", COLORS.redSoft, COLORS.red, true);
  addTextRule(findingsSheet.sheet.getRange(`C2:C${findingsSheet.lastRow}`), "P1", COLORS.orangeSoft, COLORS.orange, true);

  const workflowsSheet = addDataSheet(workbook, {
    name: "Workflows",
    tableName: "AuditWorkflows",
    headers: [
      "Workflow ID", "Title", "Domain", "Wave", "Disposition", "Status",
      "Producer", "Recipients", "Capability", "Tenant target",
      "Recipient-visible result", "Recovery", "Required tests", "Findings",
      "Owner", "Blockers", "Evidence",
    ],
    rows: workflows.map((item) => [
      item.workflowId, item.title, item.domain, item.deliveryWave, item.disposition,
      item.status, item.producer?.personaId,
      list((item.recipients ?? []).map((recipient) => recipient.personaId)),
      item.command?.capability, item.command?.tenantTarget, item.recipientVisibleResult,
      recoverySummary(item.recovery), list(item.requiredTestKinds), list(item.findingIds),
      item.owner, blockerIds(item.blockers), list(item.evidenceIds),
    ]),
    widths: [15, 34, 24, 8, 14, 30, 14, 25, 24, 32, 48, 56, 36, 34, 22, 20, 34],
    rowHeight: 52,
  });
  workflowsSheet.sheet.getRange(`D2:D${workflowsSheet.lastRow}`).format.numberFormat = "0";
  addStatusRules(workflowsSheet.sheet.getRange(`F2:F${workflowsSheet.lastRow}`));

  const tasksSheet = addDataSheet(workbook, {
    name: "Spec Tasks",
    tableName: "AuditSpecTasks",
    headers: [
      "Task ID", "Order", "Phase", "Doc", "Status", "Title",
      "Acceptance criteria", "Workflows", "Blockers", "Prior claims",
    ],
    rows: tasks.map((item) => [
      item.specTaskId, item.order, item.specPhase, item.document, item.status,
      item.title, list(item.acceptanceCriteria), list(item.workflowIds),
      blockerIds(item.blockers), priorClaims(item.priorClaims),
    ]),
    widths: [16, 10, 10, 10, 32, 35, 62, 26, 22, 58],
    rowHeight: 42,
  });
  tasksSheet.sheet.getRange(`B2:C${tasksSheet.lastRow}`).format.numberFormat = "0";
  addStatusRules(tasksSheet.sheet.getRange(`E2:E${tasksSheet.lastRow}`));

  const gateStatusById = new Map(
    (coverage.launchGates ?? []).map((item) => [item.gateId, item.status]),
  );
  const gatesSheet = addDataSheet(workbook, {
    name: "Launch Gates",
    tableName: "AuditLaunchGates",
    headers: [
      "Gate ID", "Title", "Wave", "Check kind", "Command", "Acceptance",
      "Evidence kinds", "Dependencies", "Owner", "Evidence status",
    ],
    rows: gates.map((item) => [
      item.gateId, item.title, item.deliveryWave, item.checkKind, item.command,
      item.acceptance, list(item.requiredEvidenceKinds), list(item.dependsOn),
      item.ownerRole, gateStatusById.get(item.gateId) ?? "not_verified",
    ]),
    widths: [12, 38, 9, 16, 34, 54, 28, 22, 24, 22],
    rowHeight: 42,
  });
  gatesSheet.sheet.getRange(`C2:C${gatesSheet.lastRow}`).format.numberFormat = "0";
  addStatusRules(gatesSheet.sheet.getRange(`J2:J${gatesSheet.lastRow}`));

  const risksSheet = addDataSheet(workbook, {
    name: "Risks",
    tableName: "AuditRisks",
    headers: [
      "Risk ID", "Title", "Impact", "Likelihood", "Score", "Level", "Status",
      "Mitigation", "Trigger", "Contingency", "Owner",
    ],
    rows: risks.map((item) => {
      const score = item.impact * item.likelihood;
      return [
        item.riskId, item.title, item.impact, item.likelihood, score, riskLevel(score),
        item.status, item.mitigation, item.trigger, item.contingency, item.owner,
      ];
    }),
    widths: [13, 36, 11, 12, 10, 13, 14, 54, 46, 54, 22],
    rowHeight: 48,
  });
  risksSheet.sheet.getRange(`C2:E${risksSheet.lastRow}`).format.numberFormat = "0";
  risksSheet.sheet.getRange(`E2:E${risksSheet.lastRow}`).conditionalFormats.add("dataBar", {
    color: COLORS.red,
    gradient: true,
  });
  addTextRule(risksSheet.sheet.getRange(`F2:F${risksSheet.lastRow}`), "Critical", COLORS.redSoft, COLORS.red, true);
  addTextRule(risksSheet.sheet.getRange(`F2:F${risksSheet.lastRow}`), "High", COLORS.orangeSoft, COLORS.orange, true);

  const evidenceSheet = addDataSheet(workbook, {
    name: "Evidence",
    tableName: "AuditEvidence",
    headers: [
      "Evidence ID", "Kind", "Result", "Environment", "Captured at",
      "Captured by", "Commit", "Artifact", "Findings", "Workflows", "Gates", "Notes",
    ],
    rows: evidence.map((item) => [
      item.evidenceId, item.kind, item.result, item.environment,
      new Date(item.capturedAt), item.capturedBy, item.commitSha, item.artifact,
      list(item.findingIds), list(item.workflowIds), list(item.launchGateIds), item.notes,
    ]),
    widths: [34, 24, 12, 15, 22, 18, 44, 58, 34, 28, 22, 62],
    rowHeight: 46,
  });
  evidenceSheet.sheet.getRange(`E2:E${evidenceSheet.lastRow}`).format.numberFormat = "yyyy-mm-dd hh:mm";
  addTextRule(evidenceSheet.sheet.getRange(`C2:C${evidenceSheet.lastRow}`), "pass", COLORS.greenSoft, COLORS.green, true);
  addTextRule(evidenceSheet.sheet.getRange(`C2:C${evidenceSheet.lastRow}`), "fail", COLORS.redSoft, COLORS.red, true);

  const decisionsSheet = addDataSheet(workbook, {
    name: "Decisions",
    tableName: "AuditDecisions",
    headers: ["Decision ID", "Source alias", "Topic", "Decision", "Rationale", "Status", "Owner"],
    rows: decisions.map((item) => [
      item.decisionId, item.sourceAlias, item.topic, item.decision,
      item.rationale, item.status, item.owner,
    ]),
    widths: [18, 16, 30, 58, 52, 16, 28],
    rowHeight: 48,
  });
  addStatusRules(decisionsSheet.sheet.getRange(`F2:F${decisionsSheet.lastRow}`));

  const debtSheet = addDataSheet(workbook, {
    name: "Service Role Debt",
    tableName: "AuditServiceRoleDebt",
    headers: [
      "File", "Disposition", "Workflow", "Finding", "Owner", "Reviewed at",
      "Required remediation",
    ],
    rows: serviceRoleReviews.map((item) => [
      item.file, item.disposition, item.workflowId, item.findingId, item.owner,
      new Date(`${item.reviewedAt}T00:00:00Z`), item.rationale,
    ]),
    widths: [54, 25, 16, 16, 25, 17, 62],
    rowHeight: 44,
  });
  debtSheet.sheet.getRange(`F2:F${debtSheet.lastRow}`).format.numberFormat = "yyyy-mm-dd";
  addTextRule(debtSheet.sheet.getRange(`B2:B${debtSheet.lastRow}`), "migrate_to_job", COLORS.amberSoft, COLORS.amber, true);
  addTextRule(debtSheet.sheet.getRange(`B2:B${debtSheet.lastRow}`), "replace_with_rpc", COLORS.blueSoft, "#1D4ED8", true);
  addTextRule(debtSheet.sheet.getRange(`B2:B${debtSheet.lastRow}`), "replace_with_user_rls", COLORS.purpleSoft, "#6D28D9", true);

  populateDashboard(dashboard, {
    program,
    findings,
    workflows,
    tasks,
    gates,
    risks,
    evidence,
    serviceRoleReviews,
    sourceHash,
  });
  return workbook;
}

function renderRangeFor(sheetName, workbook) {
  if (sheetName === "Dashboard") return "A1:J31";
  const usedRange = workbook.worksheets.getItem(sheetName).getUsedRange();
  const rowCount = Math.min(usedRange.rowCount ?? 25, 25);
  const columnCount = usedRange.columnCount ?? 10;
  return `A1:${columnName(columnCount - 1)}${rowCount}`;
}

async function renderWorkbook(workbook, renderDirectory) {
  await fs.mkdir(renderDirectory, { recursive: true });
  const sheetNames = ["Dashboard", ...DATA_SHEETS];
  for (let index = 0; index < sheetNames.length; index += 1) {
    const sheetName = sheetNames[index];
    const preview = await workbook.render({
      sheetName,
      range: renderRangeFor(sheetName, workbook),
      scale: 1,
      format: "png",
    });
    const filename = `${String(index + 1).padStart(2, "0")}-${sheetName
      .toLowerCase()
      .replaceAll(" ", "-")}.png`;
    await fs.writeFile(
      path.join(renderDirectory, filename),
      new Uint8Array(await preview.arrayBuffer()),
    );
  }
}

async function inspectWorkbook(workbook) {
  const summary = await workbook.inspect({
    kind: "workbook,sheet,table",
    include: "id,name,range",
    maxChars: 16000,
    tableMaxRows: 3,
    tableMaxCols: 12,
    tableMaxCellChars: 80,
  });
  const dashboard = await workbook.inspect({
    kind: "table",
    range: "'Dashboard'!A1:J31",
    include: "values,formulas",
    maxChars: 18000,
    tableMaxRows: 31,
    tableMaxCols: 10,
    tableMaxCellChars: 100,
  });
  const formulas = await workbook.inspect({
    kind: "formula",
    sheetId: "Dashboard",
    range: "A1:J31",
    maxChars: 10000,
    options: { maxResults: 200 },
  });
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "final formula error scan",
  });
  for (const report of [summary, dashboard, formulas, errors]) {
    if (report.ndjson) process.stdout.write(`${report.ndjson}\n`);
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const inspectExisting = process.argv.includes("--inspect-existing");
  const renderDirectoryOption = optionValue("--render-dir");
  const renderDirectory = renderDirectoryOption ? path.resolve(renderDirectoryOption) : null;

  if (inspectExisting) {
    const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(OUTPUT));
    await inspectWorkbook(workbook);
    if (renderDirectory) await renderWorkbook(workbook, renderDirectory);
    return;
  }

  const inputs = await loadInputs();
  const workbook = buildWorkbook(inputs);
  workbook.recalculate();
  if (renderDirectory) await renderWorkbook(workbook, renderDirectory);
  await fs.mkdir(GENERATED_ROOT, { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(OUTPUT);
  const workbookSha256 = createHash("sha256")
    .update(await fs.readFile(OUTPUT))
    .digest("hex");
  // artifact-tool may emit an adjacent diagnostic during export. It is useful
  // transiently, but is not part of the governed workbook deliverable.
  await fs.rm(`${OUTPUT}.inspect.ndjson`, { force: true });
  const manifest = {
    registrySourceSha256: inputs.sourceHash,
    workbookSha256,
    workbookPath: "generated/TOURIFY_ADMIN_WORKFLOW_TRACKER.xlsx",
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({
      workbook: path.relative(ROOT, OUTPUT),
      manifest: path.relative(ROOT, MANIFEST),
      sheets: 10,
      registrySourceSha256: inputs.sourceHash,
      workbookSha256,
      renderedTo: renderDirectory ? path.relative(ROOT, renderDirectory) : null,
    })}\n`,
  );
}

await main();
