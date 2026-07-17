#!/usr/bin/env python3
"""PreToolUse hook (service-blueprinting plugin): service-role secret guard.

Fires before Write/Edit/MultiEdit. Blocks service-role-style Supabase JWTs
(an `eyJ…` JWT whose payload contains "role":"service_role") from landing in
committable files. Deliberately narrow — matching every eyJ token would
false-positive on anon keys, which ARE allowed in gitignored .env files.

Committable = not matched by .gitignore (checked via `git check-ignore`).
Outside a git repo, everything is treated as committable (safe default).

Exit codes: 0 = allow; 2 = block (stderr is shown to Claude and the tool
call is denied, per the PreToolUse protocol).
"""

import base64
import json
import re
import subprocess
import sys
from pathlib import Path

JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{5,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{5,}")
SERVICE_ROLE_RE = re.compile(r'"role"\s*:\s*"service_role"')


def contains_service_role_jwt(text: str) -> bool:
    for match in JWT_RE.finditer(text):
        payload = match.group(1)
        try:
            decoded = base64.urlsafe_b64decode(
                payload + "=" * (-len(payload) % 4)
            ).decode("utf-8", "replace")
        except Exception:
            continue
        if SERVICE_ROLE_RE.search(decoded):
            return True
    # Fallback: a JWT alongside a decoded service_role claim in plain text.
    if JWT_RE.search(text) and SERVICE_ROLE_RE.search(text):
        return True
    return False


def gather_written_text(tool_input: dict) -> str:
    parts = []
    for key in ("content", "new_string"):
        value = tool_input.get(key)
        if isinstance(value, str):
            parts.append(value)
    for edit in tool_input.get("edits") or []:  # MultiEdit
        if isinstance(edit, dict) and isinstance(edit.get("new_string"), str):
            parts.append(edit["new_string"])
    return "\n".join(parts)


def is_gitignored(path: Path) -> bool:
    try:
        result = subprocess.run(
            ["git", "-C", str(path.parent), "check-ignore", "-q", "--", str(path)],
            capture_output=True,
            timeout=5,
        )
    except Exception:
        return False  # git unavailable → treat as committable (block)
    return result.returncode == 0  # 1 = not ignored, 128 = not a repo


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path") or ""
    text = gather_written_text(tool_input)
    if not file_path or not text:
        return 0

    if not contains_service_role_jwt(text):
        return 0

    path = Path(file_path)
    if is_gitignored(path):
        return 0  # e.g. a gitignored .env — outside this guard's scope

    print(
        f"[service-blueprinting] BLOCKED: the content being written to "
        f"{file_path} contains what looks like a Supabase service-role key "
        '(a JWT whose payload carries "role":"service_role"), and that path '
        "is committable (not gitignored). Service-role keys grant full "
        "database access and must never land in version control.\n"
        "Do instead: (1) don't persist the key at all — have the user run "
        "the privileged command (supabase CLI / SQL) in their own shell; or "
        "(2) if the user explicitly insists on saving it locally, write it "
        "only to a path that `git check-ignore` confirms is ignored (e.g. a "
        "gitignored .env) — this guard allows gitignored paths. To override "
        "entirely, the USER can disable this plugin hook in their settings; "
        "do not work around it on their behalf.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
