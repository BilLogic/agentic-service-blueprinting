#!/usr/bin/env python3
"""PostToolUse hook (service-blueprinting plugin): auto-validate IR edits.

Fires after Write/Edit/MultiEdit. If the edited file is IR YAML
(blueprint/*.yaml|*.yml inside a blueprint workspace), run validate_ir.py on
it and surface failures immediately — hand-edits must never silently break
the IR; "did you mean…" belongs at edit time, not import time.

Exit codes: 0 = pass or not applicable; 2 = validation failed (stderr is fed
back to Claude by the PostToolUse protocol).

Path resolution (never hardcoded): the validator is looked up in the
workspace clone (<workspace>/scripts/validate_ir.py), then in this plugin's
own root (relative to this file, or $CLAUDE_PLUGIN_ROOT). Contract with the
validator: `python3 validate_ir.py <ir-file>` exits 0 on success, non-zero
with human-readable errors on stdout/stderr otherwise. If no validator is
found (it ships in a later unit / older template clone), exit 0 silently.
"""

import json
import os
import subprocess
import sys
from pathlib import Path


def find_workspace_root(start: Path):
    """Ascend from the edited file looking for blueprint-workspace.json."""
    for parent in [start, *start.parents]:
        if (parent / "blueprint-workspace.json").is_file():
            return parent
    return None


def find_validator(workspace_root: Path):
    candidates = [workspace_root / "scripts" / "validate_ir.py"]
    plugin_root = Path(__file__).resolve().parent.parent
    candidates.append(plugin_root / "scripts" / "validate_ir.py")
    env_root = os.environ.get("CLAUDE_PLUGIN_ROOT")
    if env_root:
        candidates.append(Path(env_root) / "scripts" / "validate_ir.py")
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path") or ""
    if not file_path:
        return 0

    path = Path(file_path)
    if path.suffix.lower() not in (".yaml", ".yml"):
        return 0
    if "blueprint" not in path.parts:
        return 0
    if not path.is_file():
        return 0

    workspace_root = find_workspace_root(path.parent)
    if workspace_root is None:
        return 0  # IR-looking file outside a blueprint workspace — not ours

    validator = find_validator(workspace_root)
    if validator is None:
        return 0  # validator not present in this workspace/plugin version

    try:
        result = subprocess.run(
            [sys.executable, str(validator), str(path)],
            capture_output=True,
            text=True,
            timeout=45,
            cwd=str(workspace_root),
        )
    except subprocess.TimeoutExpired:
        print(
            f"[service-blueprinting] validate_ir.py timed out on {path}",
            file=sys.stderr,
        )
        return 2

    if result.returncode == 0:
        return 0

    output = (result.stdout + "\n" + result.stderr).strip()
    print(
        f"[service-blueprinting] IR validation FAILED for {path} "
        f"(validate_ir.py exit {result.returncode}):\n{output}\n"
        "Fix the IR before proceeding — imports are gated on a passing "
        "validator.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
