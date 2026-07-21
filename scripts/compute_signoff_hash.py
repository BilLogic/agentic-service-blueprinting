#!/usr/bin/env python3
"""Compute the per-scenario sign-off content hash for a Service Blueprint IR.

Usage:
    python3 scripts/compute_signoff_hash.py <ir-file> [--scenario <key>] [--json]

Sign-off binds to a hash of ONE scenario's content, not the whole IR file.
Adding or editing a scenario therefore changes only that scenario's hash —
previously signed-off siblings stay signed (see references/workspace-state.md
and friction #19: a whole-file hash de-signed every scenario whenever any new
phase was appended).

The hashed unit is a scenario's full subtree from the IR (key, name,
description, view_type, order, steps, paths — all locales inline), serialized
canonically so the hash is stable across machines and re-serializations:

  * JSON with sorted keys and no insignificant whitespace,
  * Unicode NFC-normalized,
  * UTF-8 encoded, then SHA-256.

Locale text lives inside the subtree (locale maps), so one hash covers every
authored locale of that scenario. Status/notes in blueprint-workspace.json are
NOT part of the content and never enter the hash.

Output (default): one `<scenario-key>\\tsha256:<hex>` line per scenario, in IR
order. With --json: a `{ "<key>": "sha256:<hex>" }` object. With --scenario
<key>: only that scenario (exit 2 if the key is absent).

Stdlib only. Loads via validate_ir.load_ir (JSON native; YAML only if PyYAML
is importable) but does NOT run validation — hashing is independent of it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_ir  # noqa: E402


def iter_scenarios(doc: dict):
    """Yield (scenario_key, scenario_dict) in IR order across all phases."""
    lifecycle = doc.get("lifecycle", {})
    for phase in lifecycle.get("phases", []):
        for scenario in phase.get("scenarios", []):
            yield scenario["key"], scenario


def scenario_content_hash(scenario: dict) -> str:
    """Canonical SHA-256 of a scenario subtree: sorted keys, no whitespace,
    NFC-normalized, UTF-8. Deterministic across machines and re-serializations."""
    canonical = json.dumps(
        scenario, sort_keys=True, ensure_ascii=False, separators=(",", ":")
    )
    canonical = unicodedata.normalize("NFC", canonical)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Compute per-scenario sign-off content hashes for a blueprint IR."
    )
    parser.add_argument("ir_file", help="IR file (.json native; .yaml if PyYAML is installed)")
    parser.add_argument("--scenario", help="only hash this scenario key")
    parser.add_argument("--json", action="store_true", help="emit a JSON {key: hash} object")
    args = parser.parse_args(argv)

    doc, load_error = validate_ir.load_ir(Path(args.ir_file))
    if load_error is not None:
        print(f"ERROR: {load_error}", file=sys.stderr)
        return 1

    hashes = {key: scenario_content_hash(sc) for key, sc in iter_scenarios(doc)}

    if args.scenario is not None:
        if args.scenario not in hashes:
            print(
                f"ERROR: scenario '{args.scenario}' not found in {args.ir_file} "
                f"(present: {', '.join(hashes) or 'none'})",
                file=sys.stderr,
            )
            return 2
        hashes = {args.scenario: hashes[args.scenario]}

    if args.json:
        print(json.dumps(hashes, ensure_ascii=False, indent=2))
    else:
        for key, digest in hashes.items():
            print(f"{key}\t{digest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
