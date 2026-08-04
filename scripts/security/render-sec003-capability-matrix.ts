import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  adminCommandCapabilityMatrix,
  type AdminCommandCapabilityMode,
} from "../../lib/admin/api-route-registry";
import { ADMIN_NAV_CAPABILITY_RULES } from "../../lib/admin/capability-aware-ui";
import { defaultAdminRolesForCapabilities } from "../../lib/auth/admin-capabilities";

function rolesFor(
  capabilities: Parameters<typeof defaultAdminRolesForCapabilities>[0],
  mode: AdminCommandCapabilityMode | "anyOf",
) {
  if (mode === "principal") return "non-user principal";
  const roleMode = mode === "allOf" ? "allOf" : "anyOf";
  return (
    defaultAdminRolesForCapabilities(capabilities, roleMode).join(", ") ||
    "none by default"
  );
}

function cell(value: unknown): string {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function render(): string {
  const commands = adminCommandCapabilityMatrix();
  const lines = [
    "# SEC-003 generated capability review matrix",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "This is a review artifact generated from the canonical navigation rules, API registry, capability catalog, and default-role map. Generation does not prove route enforcement; SEC-104 owns implementation convergence.",
    "",
    "## Navigation",
    "",
    "| Surface | Path | Match | Required (any of) | Default roles |",
    "|---|---|---|---|---|",
  ];

  for (const rule of ADMIN_NAV_CAPABILITY_RULES) {
    lines.push(
      `| ${cell(rule.surfaceLabel)} | \`${cell(rule.pathPrefix)}\` | ${rule.exact ? "exact" : "prefix"} | ${rule.anyOf.map((capability) => `\`${capability}\``).join(", ")} | ${cell(rolesFor(rule.anyOf, "anyOf"))} |`,
    );
  }

  lines.push(
    "",
    "## API commands",
    "",
    "| Method | Route | Acting context | Capability mode | Required capabilities | Request schema | Response schema | Idempotency | Audit | Default roles | Owner |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  );

  for (const command of commands) {
    lines.push(
      `| ${command.method} | \`${cell(command.route)}\` | ${command.actingContext} | ${command.capabilityMode} | ${command.capabilities.map((capability) => `\`${capability}\``).join(", ") || "principal contract"} | \`${cell(command.requestSchema)}\` | \`${cell(command.responseSchema)}\` | ${command.idempotency} | ${command.audit} | ${cell(rolesFor(command.capabilities, command.capabilityMode))} | ${cell(command.owner)} |`,
    );
  }

  lines.push(
    "",
    "## Required sign-off",
    "",
    "| Review | Approver | Date | Evidence location | Result |",
    "|---|---|---|---|---|",
    "| Product | pending | pending | pending | pending |",
    "| Security | pending | pending | pending | pending |",
    "",
    "Any pending or rejected row blocks SEC-003 completion. Store signed review output in the access-controlled release/security evidence system.",
    "",
  );

  return lines.join("\n");
}

const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const document = render();

if (output)
  writeFileSync(path.resolve(output), document, {
    encoding: "utf8",
    mode: 0o600,
  });
else process.stdout.write(document);
