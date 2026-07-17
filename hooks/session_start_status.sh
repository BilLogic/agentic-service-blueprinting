#!/usr/bin/env bash
# SessionStart hook (service-blueprinting plugin).
# If the session starts inside a blueprint workspace (blueprint-workspace.json
# in cwd), print a concise status summary to stdout — SessionStart stdout is
# injected into context, so any session resumes intelligently. In every other
# session, exit 0 instantly: plugin hooks fire everywhere once enabled, and
# non-blueprint sessions must pay zero cost.
set -u

[ -f "blueprint-workspace.json" ] || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

python3 - <<'PY'
import json
import sys

try:
    with open("blueprint-workspace.json", encoding="utf-8") as f:
        ws = json.load(f)
except Exception as exc:  # malformed state is itself worth surfacing
    print(
        "[service-blueprinting] blueprint-workspace.json exists but could not "
        f"be parsed ({exc}). Inspect it before doing any blueprint work."
    )
    sys.exit(0)

lines = ["[service-blueprinting] Blueprint workspace detected."]

schema_version = ws.get("schema_version")
if schema_version:
    lines.append(f"Template schema_version: {schema_version}")

ir_path = ws.get("ir_path")
if ir_path:
    lines.append(f"IR: {ir_path}")

scenarios = ws.get("scenarios") or {}
if scenarios:
    counts = {}
    for entry in scenarios.values():
        status = (entry or {}).get("status", "unknown")
        counts[status] = counts.get(status, 0) + 1
    summary = ", ".join(f"{n} {status}" for status, n in sorted(counts.items()))
    lines.append(f"Scenarios: {len(scenarios)} tracked ({summary}).")
else:
    lines.append("Scenarios: none tracked yet.")

sign_off = ws.get("sign_off") or {}
content_hash = sign_off.get("content_hash")
if content_hash:
    lines.append(
        f"Sign-off hash recorded: {content_hash[:19]}… "
        f"(signed {sign_off.get('signed_at', 'unknown')})"
    )
else:
    lines.append("Sign-off: none recorded — IR is not importable yet.")

targets = ws.get("targets") or {}
for locale, target in sorted(targets.items()):
    target = target or {}
    mode = target.get("mode", "?")
    imported = "imported" if target.get("last_import") else "never imported"
    deployed = target.get("deploy_url") or "not deployed"
    lines.append(f"Target [{locale}]: mode={mode}, {imported}, {deployed}")

lines.append(
    "Use the service-blueprinting skill to resume; it routes by this state "
    "(see references/workspace-state.md)."
)
print("\n".join(lines))
PY
exit 0
