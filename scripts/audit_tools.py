#!/usr/bin/env python3
"""Deterministic audit mechanics — fingerprint, dedupe, export, report.

The audit's two most correctness-critical steps (fingerprint identity and
the dedupe decision) must never be improvised per run: two agents
hand-rolling them will disagree on a separator or a status rule and split
the finding history. This script IS the reference implementation of
audit-playbook §2 (fingerprint) and §3 (dedupe table), plus the §1 export
and the no-DB findings-report substrate.

Usage:
    python3 scripts/audit_tools.py fingerprint --check gap-sweep \
        --cell-keys k1 k2 ...              # or --scope "warm-up:orphan-step"
    python3 scripts/audit_tools.py export <ir-file> [--scenario <key>] \
        --out audit/export-<scenario>.json
    python3 scripts/audit_tools.py dedupe --ledger audit/findings-report.json \
        --incoming <findings.json>          # prints actions, applies nothing
    python3 scripts/audit_tools.py report --ledger audit/findings-report.json \
        --incoming <findings.json> --run-id <uuid> --apply
        # applies §3 to the file ledger (the no-DB route substrate)

Stdlib only. Exit 0 on success; 1 on bad input.

Findings JSON shape (both incoming and ledger rows):
    {"check_name": str, "severity": "info|warn|critical", "note": str,
     "cell_keys": [str, ...], "scope": str|null, "source": "audit|whatif",
     "fingerprint": str (computed here — never hand-written),
     "status": "open|resolved|dismissed", "run_id": str}
The ledger file is {"rows": [row, ...]}.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


def fingerprint(check_name: str, cell_keys: list[str], scope: str | None) -> str:
    """audit-playbook §2, exactly. Scope form requires a reason slug so two
    zero-cell findings from one check cannot collide."""
    if cell_keys:
        digest = hashlib.sha256("\n".join(sorted(cell_keys)).encode("utf-8")).hexdigest()
        return f"{check_name}:{digest}"
    if not scope:
        raise ValueError("zero-cell finding needs --scope 'scenario-key:reason-slug'")
    return f"{check_name}:scope:{scope}"


def dedupe_action(existing_rows: list[dict], fp: str) -> str:
    """audit-playbook §3: nothing -> insert; open -> update; dismissed ->
    drop; resolved -> reopen. Dismissed wins over resolved (a human said no)."""
    statuses = {row["status"] for row in existing_rows if row.get("fingerprint") == fp}
    if "open" in statuses:
        return "update"
    if "dismissed" in statuses:
        return "drop"
    if "resolved" in statuses:
        return "reopen"
    return "insert"


def load_ir(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def cmd_fingerprint(args: argparse.Namespace) -> int:
    try:
        print(fingerprint(args.check, args.cell_keys or [], args.scope))
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


def cmd_export(args: argparse.Namespace) -> int:
    ir = load_ir(Path(args.ir))
    lifecycle = ir.get("lifecycle", {})
    if args.scenario:
        for phase in lifecycle.get("phases", []):
            phase["scenarios"] = [
                scenario
                for scenario in phase.get("scenarios", [])
                if scenario.get("key") == args.scenario
            ]
        lifecycle["phases"] = [
            phase for phase in lifecycle.get("phases", []) if phase.get("scenarios")
        ]
        if not lifecycle["phases"]:
            print(f"error: no scenario with key {args.scenario!r}", file=sys.stderr)
            return 1
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({"schema_version": ir.get("schema_version"), "lifecycle": lifecycle},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"export written: {out}")
    return 0


def _load_ledger(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"rows": []}


def _plan(ledger: dict, incoming: list[dict], run_id: str | None) -> list[tuple[str, dict]]:
    plan: list[tuple[str, dict]] = []
    for finding in incoming:
        fp = fingerprint(
            finding["check_name"], finding.get("cell_keys") or [], finding.get("scope")
        )
        finding = {**finding, "fingerprint": fp}
        if run_id:
            finding["run_id"] = run_id
        plan.append((dedupe_action(ledger["rows"], fp), finding))
    return plan


def cmd_dedupe(args: argparse.Namespace) -> int:
    ledger = _load_ledger(Path(args.ledger))
    incoming = json.loads(Path(args.incoming).read_text(encoding="utf-8"))
    for action, finding in _plan(ledger, incoming, None):
        print(f"{action:7s} {finding['fingerprint']}")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    ledger_path = Path(args.ledger)
    ledger = _load_ledger(ledger_path)
    incoming = json.loads(Path(args.incoming).read_text(encoding="utf-8"))
    counts = {"insert": 0, "update": 0, "drop": 0, "reopen": 0}
    for action, finding in _plan(ledger, incoming, args.run_id):
        counts[action] += 1
        if not args.apply:
            continue
        rows = ledger["rows"]
        if action == "insert":
            rows.append({**finding, "status": "open"})
        elif action in ("update", "reopen"):
            for row in rows:
                if row["fingerprint"] == finding["fingerprint"] and row["status"] in (
                    "open" if action == "update" else "resolved",
                ):
                    row.update(
                        {k: finding[k] for k in ("severity", "note", "run_id") if k in finding}
                    )
                    row["status"] = "open"
                    break
        # drop: nothing lands — dismissed stays dismissed.
    if args.apply:
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_text(
            json.dumps(ledger, ensure_ascii=False, indent=1), encoding="utf-8"
        )
    print(json.dumps({"applied": bool(args.apply), **counts}))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("fingerprint")
    p.add_argument("--check", required=True)
    p.add_argument("--cell-keys", nargs="*")
    p.add_argument("--scope")
    p.set_defaults(fn=cmd_fingerprint)

    p = sub.add_parser("export")
    p.add_argument("ir")
    p.add_argument("--scenario")
    p.add_argument("--out", required=True)
    p.set_defaults(fn=cmd_export)

    p = sub.add_parser("dedupe")
    p.add_argument("--ledger", required=True)
    p.add_argument("--incoming", required=True)
    p.set_defaults(fn=cmd_dedupe)

    p = sub.add_parser("report")
    p.add_argument("--ledger", required=True)
    p.add_argument("--incoming", required=True)
    p.add_argument("--run-id", required=True)
    p.add_argument("--apply", action="store_true")
    p.set_defaults(fn=cmd_report)

    args = parser.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
