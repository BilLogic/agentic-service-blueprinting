#!/usr/bin/env python3
"""Compute all audit finding fingerprints."""
import hashlib
import json
import uuid
from pathlib import Path

SANDBOX = Path("/private/tmp/claude-501/-Users-billguo-Desktop-uno-blueprint/b7f00cb3-1de6-407b-8b04-015e6dde730b/scratchpad/skill-eval/audit-sandbox")
OUTPUT = SANDBOX / "audit-findings-wave1.json"
SCRIPT = SANDBOX / "build_report.py"


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
    finding("warn", ["procurement-single-path/procurement-happy/gov/tender"], "Term «tender» (English data-object gloss) in customer cell procurement-single-path/procurement-happy/gov/tender; plainer candidate: 招标.", "jargon-lint"),
    finding("warn", ["procurement-single-path/procurement-happy/gov/contract", "procurement-single-path/procurement-happy/front/contract"], "Term «contract» (English data-object gloss) in customer/frontstage cells procurement-single-path/procurement-happy/gov/contract and …/front/contract; plainer candidate: 合同.", "jargon-lint"),
    finding("warn", ["impl-migration/dir-c-bills/gov/accept", "impl-migration/dir-a-singlelamp/gov/accept", "impl-migration/dir-b-cetc-box/gov/accept", "daily-inspection/happy-lamp-onsite/field/check", "daily-inspection/exception-boxside-offline/field/check"], "Term «asset» (internal ledger/table name) in customer/frontstage cells impl-migration/*/gov/accept and daily-inspection/*/field/check; plainer candidate: 资产台账/灯杆档案.", "jargon-lint"),
    finding("warn", ["impl-migration/dir-c-bills/gov/accept", "impl-migration/dir-a-singlelamp/gov/accept", "impl-migration/dir-b-cetc-box/gov/accept"], "Term «perms» (unexpanded acronym) in customer cells impl-migration/dir-c-bills/gov/accept, …/dir-a-singlelamp/gov/accept, and …/dir-b-cetc-box/gov/accept; plainer candidate: 权限.", "jargon-lint"),
    finding("warn", ["impl-migration/dir-c-bills/field/pilot", "impl-migration/dir-a-singlelamp/field/pilot", "impl-migration/dir-b-cetc-box/field/pilot", "impl-migration/dir-c-bills/gov/accept", "impl-migration/dir-a-singlelamp/gov/accept", "impl-migration/dir-b-cetc-box/gov/accept", "fault-repair-closed-loop/happy-lamp-side/citizen/report", "fault-repair-closed-loop/happy-lamp-side/fdig/intake", "energy-anomaly-monitoring/happy-anomaly-loop/fdig/oversee", "energy-anomaly-monitoring/exception-datagap-reconcile/fdig/oversee", "annual-maintenance-renewal/renew-happy/fdig/assess", "annual-maintenance-renewal/exit-handover/fdig/assess"], "Term «MVP» (internal acronym / task-board tag) in customer/frontstage cells across impl-migration pilots and accepts, fault-repair-closed-loop/happy-lamp-side/citizen/report and …/fdig/intake, energy-anomaly-monitoring/*/fdig/oversee, and annual-maintenance-renewal/*/fdig/assess; plainer candidate: 首版/试点版.", "jargon-lint"),
    finding("warn", ["impl-migration/dir-c-bills/field/handover-docs", "impl-migration/dir-a-singlelamp/field/handover-docs", "impl-migration/dir-b-cetc-box/field/handover-docs"], "Term «ACU» (unexplained device acronym) in frontstage cells impl-migration/*/field/handover-docs; plainer candidate: 箱体控制器.", "jargon-lint"),
    finding("warn", ["impl-migration/dir-c-bills/field/handover-docs", "impl-migration/dir-a-singlelamp/field/handover-docs", "impl-migration/dir-b-cetc-box/field/handover-docs"], "Term «TCU» (unexplained device acronym) in frontstage cells impl-migration/*/field/handover-docs; plainer candidate: 单灯控制器.", "jargon-lint"),
    finding("info", ["impl-migration/dir-c-bills/field/pilot", "impl-migration/dir-a-singlelamp/field/pilot", "impl-migration/dir-b-cetc-box/field/pilot"], "Term «线框走查» (design-process jargon) in frontstage cells impl-migration/*/field/pilot; plainer candidate: 界面操作走查.", "jargon-lint"),
    finding("warn", ["accounts-training-onboarding/onboarding/qingyi/accounts", "accounts-training-onboarding/onboarding/qingyi/training", "accounts-training-onboarding/onboarding/qingyi/trial-upload"], "Term «user» (English data-object gloss) in customer cells accounts-training-onboarding/onboarding/qingyi/accounts, …/training, and …/trial-upload; plainer candidate: 账号.", "jargon-lint"),
    finding("warn", ["accounts-training-onboarding/onboarding/qingyi/training", "accounts-training-onboarding/onboarding/delivery/training"], "Term «role» (English data-object gloss) in customer/frontstage cells accounts-training-onboarding/onboarding/qingyi/training and …/delivery/training; plainer candidate: 权限角色.", "jargon-lint"),
    finding("warn", ["daily-inspection/happy-lamp-onsite/field/schedule", "daily-inspection/exception-boxside-offline/field/schedule"], "Term «inspection_task» (internal system name) in frontstage cells daily-inspection/happy-lamp-onsite/field/schedule and …/exception-boxside-offline/field/schedule; plainer candidate: 派工单.", "jargon-lint"),
    finding("warn", ["daily-inspection/happy-lamp-onsite/field/patrol", "daily-inspection/happy-lamp-onsite/field/check", "daily-inspection/happy-lamp-onsite/field/close", "daily-inspection/exception-boxside-offline/field/patrol", "daily-inspection/exception-boxside-offline/field/close"], "Term «inspection_record» (internal system name) in frontstage cells daily-inspection/*/field/patrol, happy-lamp-onsite/field/check, and */field/close; plainer candidate: 巡检记录.", "jargon-lint"),
    finding("warn", ["daily-inspection/happy-lamp-onsite/field/close", "energy-anomaly-monitoring/happy-anomaly-loop/field/handle", "replace-retrofit-exit/approved-recovered/fdig/report", "replace-retrofit-exit/rejected-carryover/fdig/report"], "Term «work_order» (internal system name) in frontstage cells daily-inspection/happy-lamp-onsite/field/close, energy-anomaly-monitoring/happy-anomaly-loop/field/handle, and replace-retrofit-exit/*/fdig/report; plainer candidate: 工单.", "jargon-lint"),
    finding("warn", ["daily-inspection/exception-boxside-offline/field/check", "daily-inspection/exception-boxside-offline/field/attribute"], "Term «fault» / «fault.side» (internal schema names) in frontstage cells daily-inspection/exception-boxside-offline/field/check and …/field/attribute; plainer candidate: 故障记录/故障归属.", "jargon-lint"),
    finding("warn", ["assessment-reporting-loop/on-target-close/gov/define-profile", "assessment-reporting-loop/rectification-reject-branch/gov/define-profile", "energy-anomaly-monitoring/happy-anomaly-loop/gov/oversee", "energy-anomaly-monitoring/exception-datagap-reconcile/gov/oversee", "energy-anomaly-monitoring/happy-anomaly-loop/fdig/oversee", "annual-maintenance-renewal/renew-happy/fdig/assess", "annual-maintenance-renewal/exit-handover/fdig/assess"], "Term «KPI» (unexpanded acronym) in customer/frontstage cells assessment-reporting-loop/*/gov/define-profile, energy-anomaly-monitoring/*/gov/oversee, …/happy-anomaly-loop/fdig/oversee, and annual-maintenance-renewal/*/fdig/assess; plainer candidate: 考核指标.", "jargon-lint"),
    finding("warn", ["energy-anomaly-monitoring/happy-anomaly-loop/gov/oversee"], "Term «kpi_profile» (internal data-object name) in customer cell energy-anomaly-monitoring/happy-anomaly-loop/gov/oversee; plainer candidate: 考核口径档案.", "jargon-lint"),
    finding("warn", ["energy-anomaly-monitoring/exception-datagap-reconcile/gov/oversee"], "Term «is_estimated» (internal field name) in customer cell energy-anomaly-monitoring/exception-datagap-reconcile/gov/oversee; plainer candidate: 是否估算.", "jargon-lint"),
]

SKIP_REASON = "user scoped run to wave 1 only"
TOTAL_FINDINGS = len(GAP_FINDINGS) + len(JARGON_FINDINGS)

report = {
    "run_id": str(uuid.uuid4()),
    "mode": "local-report",
    "db_writes": False,
    "scope": "whole-lifecycle",
    "export": "blueprint/blueprint.json",
    "checks": {
        "gap-sweep": {"status": "completed", "found": len(GAP_FINDINGS), "findings": GAP_FINDINGS},
        "jargon-lint": {"status": "completed", "found": len(JARGON_FINDINGS), "findings": JARGON_FINDINGS},
        "channel-conflict": {"status": "completed", "found": 0, "findings": []},
        "kpi-alignment": {"status": "skipped", "skip_reason": SKIP_REASON},
        "perceived-owner": {"status": "skipped", "skip_reason": SKIP_REASON},
        "value-ledger": {"status": "skipped", "skip_reason": SKIP_REASON},
        "fee-visibility": {"status": "skipped", "skip_reason": SKIP_REASON},
    },
    "summary": {"completed": 3, "skipped": 4, "failed": 0, "total_findings": TOTAL_FINDINGS},
}

OUTPUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
if SCRIPT.exists():
    SCRIPT.unlink()
print(json.dumps(report, indent=2, ensure_ascii=False))
