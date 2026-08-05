#!/usr/bin/env python3
import importlib.util
import json
import os

path = "/private/tmp/claude-501/-Users-billguo-Desktop-uno-blueprint/b7f00cb3-1de6-407b-8b04-015e6dde730b/scratchpad/skill-eval/audit-sandbox/_sha256_pure.py"
spec = importlib.util.spec_from_file_location("sha256_pure", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# Self-tests
assert mod.sha256(b"") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
assert mod.sha256(b"abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
assert mod.sha256(b"hello") == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
print("SELF_TEST_PASS")

os.environ["AUDIT_RUN_ID"] = "7c2f9a1e-5b84-4d3c-a9e0-1f6b8c4d2e90"

# Re-exec main block logic
from pathlib import Path
SANDBOX = Path(path).resolve().parent
RUN_ID = "7c2f9a1e-5b84-4d3c-a9e0-1f6b8c4d2e90"
SKIP_REASON = "user scoped run to wave 1 only"

report = {
    "run_id": RUN_ID,
    "mode": "local-report",
    "db_writes": False,
    "scope": "whole-lifecycle",
    "export": "blueprint/blueprint.json",
    "checks": {
        "gap-sweep": {"status": "completed", "found": len(mod.GAP_FINDINGS), "findings": mod.GAP_FINDINGS},
        "jargon-lint": {"status": "completed", "found": len(mod.JARGON_FINDINGS), "findings": mod.JARGON_FINDINGS},
        "channel-conflict": {"status": "completed", "found": 0, "findings": []},
        "kpi-alignment": {"status": "skipped", "skip_reason": SKIP_REASON},
        "perceived-owner": {"status": "skipped", "skip_reason": SKIP_REASON},
        "value-ledger": {"status": "skipped", "skip_reason": SKIP_REASON},
        "fee-visibility": {"status": "skipped", "skip_reason": SKIP_REASON},
    },
    "summary": {
        "completed": 3,
        "skipped": 4,
        "failed": 0,
        "total_findings": len(mod.GAP_FINDINGS) + len(mod.JARGON_FINDINGS),
    },
}

fps = {
    "run_id": RUN_ID,
    "self_test_abc": mod.sha256(b"abc"),
    "gap": [f["fingerprint"] for f in mod.GAP_FINDINGS],
    "jargon": [f["fingerprint"] for f in mod.JARGON_FINDINGS],
}

(SANDBOX / "audit-findings-wave1.json").write_text(
    json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
(SANDBOX / "audit-fps.json").write_text(
    json.dumps(fps, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(fps, indent=2))
