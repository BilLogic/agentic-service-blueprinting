#!/usr/bin/env python3
"""Generate audit-findings-wave1.json with computed fingerprints."""
import hashlib
import json
import uuid
from pathlib import Path

SANDBOX = Path("/private/tmp/claude-501/-Users-billguo-Desktop-uno-blueprint/b7f00cb3-1de6-407b-8b04-015e6dde730b/scratchpad/skill-eval/audit-sandbox")
OUTPUT = SANDBOX / "audit-findings-wave1.json"


def fingerprint(check_name: str, cell_keys: list[str]) -> str:
    sorted_keys = sorted(cell_keys)
    payload = "\n".join(sorted_keys)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"{check_name}:{digest}"


def finding(severity: str, cell_keys: list[str], note: str, check_name: str) -> dict:
    sorted_keys = sorted(cell_keys)
    return {
        "severity": severity,
        "cell_keys": sorted_keys,
        "note": note,
        "fingerprint": fingerprint(check_name, cell_keys),
    }


GAP_FINDINGS = [
    finding(
        "critical",
        [
            "fault-repair-closed-loop/happy-lamp-side/fdig/intake",
            "fault-repair-closed-loop/happy-lamp-side/fdig/push",
            "fault-repair-closed-loop/happy-lamp-side/citizen/dispatch",
        ],
        "Path happy-lamp-side: Frontstage · digital (fdig) is silent across locate, dispatch, accept, inspect, onsite-fix, and close (flanked by fdig@intake and fdig@push). Citizen@dispatch (Check progress · nudge) is a customer-visible mini-program moment on the interaction line with no frontstage_tech cell in that stretch.",
        "gap-sweep",
    ),
    finding(
        "critical",
        [
            "fault-repair-closed-loop/exception-box-side/fdig/intake",
            "fault-repair-closed-loop/exception-box-side/fdig/push",
            "fault-repair-closed-loop/exception-box-side/citizen/dispatch",
        ],
        "Path exception-box-side: Frontstage · digital (fdig) is silent across locate, dispatch, accept, inspect, external, and close (flanked by fdig@intake and fdig@push). Citizen@dispatch (Check progress · nudge) is a customer-visible mini-program moment on the interaction line with no frontstage_tech cell in that stretch.",
        "gap-sweep",
    ),
    finding(
        "critical",
        ["annual-maintenance-renewal/renew-happy/gov/report"],
        "Path renew-happy: customer_actions gov@report (Report fault · raise issue) is a customer-visible report moment, but frontstage lanes staff and fdig have no cell at report — interaction-line gap with no frontstage coverage.",
        "gap-sweep",
    ),
    finding(
        "critical",
        ["annual-maintenance-renewal/exit-handover/gov/report"],
        "Path exit-handover: customer_actions gov@report (Report fault · raise issue) is a customer-visible report moment, but frontstage lanes staff and fdig have no cell at report — interaction-line gap with no frontstage coverage.",
        "gap-sweep",
    ),
]

JARGON_FINDINGS = [
    finding("warn", ["bid-win-entry/bid-entry-main/front/spot-opportunity"], "Term «BD» (org-chart acronym) in frontstage cell bid-win-entry/bid-entry-main/front/spot-opportunity; plainer candidate: 商务/业务拓展.", "jargon-lint"),
    finding("warn", ["bid-win-entry/bid-entry-main/gov/spot-opportunity", "bid-win-entry/bid-entry-main/front/spot-opportunity"], "Term «opportunity» (English data-object gloss) in customer/frontstage cells bid-win-entry/bid-entry-main/gov/spot-opportunity and …/front/spot-opportunity; plainer candidate: 招标机会/商机.", "jargon-lint"),
    finding("warn", ["bid-win-entry/bid-entry-main/gov/lamp-bid", "bid-win-entry/bid-entry-main/front/lamp-bid"], "Term «bid» (English data-object gloss) in customer/frontstage cells bid-win-entry/bid-entry-main/gov/lamp-bid and …/front/lamp-bid; plainer candidate: 投标.", "jargon-lint"),
    finding("warn", ["bid-win-entry/bid-entry-main/gov/platform-proposal", "bid-win-entry/bid-entry-main/front/platform-proposal", "bid-win-entry/bid-entry-main/fdig/platform-proposal"], "Term «proposal» (English data-object gloss) in customer/frontstage cells bid-win-entry/bid-entry-main/gov/platform-proposal, …/front/platform-proposal, and …/fdig/platform-proposal; plainer candidate: 方案/提案.", "jargon-lint"),
    finding("warn", ["bid-win-entry/bid-entry-main/front/platform-proposal", "bid-win-entry/bid-entry-main/fdig/platform-proposal"], "Term «Demo» (unexpanded acronym) in frontstage cells bid-win-entry/bid-entry-main/front/platform-proposal and …/fdig/platform-proposal; plainer candidate: 演示.", "jargon-lint"),
    finding("info", ["bid-win-entry/bid-entry-main/gov/spot-opportunity"], "Term «物理证据» (blueprint-method jargon) in customer cell bid-win-entry/bid-entry-main/gov/spot-opportunity; plainer candidate: 可见材料/凭证.", "jargon-lint"),
    finding("warn", ["procurement-single-path/procurement-happy/front/initiation"], "Term «售前» (org-chart label) in frontstage cell procurement-single-path/procurement-happy/front/initiation; plainer candidate: 客户对接人员.", "jargon-lint"),
    finding("warn", ["procurement-single-path/procurement-happy/gov/initiation"], "Term «project» (English data-object gloss) in customer cell procurement-single-path/procurement-happy/gov/initiation; plainer candidate: 项目.", "jargon-lint"),
    finding("warn", ["procurement-single-path/procurement-happy/gov/tender"], "Term «term» (English data-object gloss) in customer cell procurement-single-path/procurement-happy/gov/tender; plainer candidate: 招标.", "jargon-lint"),
]
