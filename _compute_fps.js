const crypto = require('crypto');
const payloads = [
["gap-sweep", ["fault-repair-closed-loop/happy-lamp-side/fdig/intake","fault-repair-closed-loop/happy-lamp-side/fdig/push","fault-repair-closed-loop/happy-lamp-side/citizen/dispatch"]],
["gap-sweep", ["fault-repair-closed-loop/exception-box-side/fdig/intake","fault-repair-closed-loop/exception-box-side/fdig/push","fault-repair-closed-loop/exception-box-side/citizen/dispatch"]],
["gap-sweep", ["annual-maintenance-renewal/renew-happy/gov/report"]],
["gap-sweep", ["annual-maintenance-renewal/exit-handover/gov/report"]],
["jargon-lint", ["bid-win-entry/bid-entry-main/front/spot-opportunity"]],
["jargon-lint", ["bid-win-entry/bid-entry-main/gov/spot-opportunity","bid-win-entry/bid-entry-main/front/spot-opportunity"]],
["jargon-lint", ["bid-win-entry/bid-entry-main/gov/lamp-bid","bid-win-entry/bid-entry-main/front/lamp-bid"]],
["jargon-lint", ["bid-win-entry/bid-entry-main/gov/platform-proposal","bid-win-entry/bid-entry-main/front/platform-proposal","bid-win-entry/bid-entry-main/fdig/platform-proposal"]],
["jargon-lint", ["bid-win-entry/bid-entry-main/front/platform-proposal","bid-win-entry/bid-entry-main/fdig/platform-proposal"]],
["jargon-lint", ["bid-win-entry/bid-entry-main/gov/spot-opportunity"]],
["jargon-lint", ["procurement-single-path/procurement-happy/front/initiation"]],
["jargon-lint", ["procurement-single-path/procurement-happy/gov/initiation"]],
["jargon-lint", ["procurement-single-path/procurement-happy/gov/tender"]],
["jargon-lint", ["procurement-single-path/procurement-happy/gov/contract","procurement-single-path/procurement-happy/front/contract"]],
["jargon-lint", ["impl-migration/dir-c-bills/gov/accept","impl-migration/dir-a-singlelamp/gov/accept","impl-migration/dir-b-cetc-box/gov/accept","daily-inspection/happy-lamp-onsite/field/check","daily-inspection/exception-boxside-offline/field/check"]],
["jargon-lint", ["impl-migration/dir-c-bills/gov/accept","impl-migration/dir-a-singlelamp/gov/accept","impl-migration/dir-b-cetc-box/gov/accept"]],
["jargon-lint", ["impl-migration/dir-c-bills/field/pilot","impl-migration/dir-a-singlelamp/field/pilot","impl-migration/dir-b-cetc-box/field/pilot","impl-migration/dir-c-bills/gov/accept","impl-migration/dir-a-singlelamp/gov/accept","impl-migration/dir-b-cetc-box/gov/accept","fault-repair-closed-loop/happy-lamp-side/citizen/report","fault-repair-closed-loop/happy-lamp-side/fdig/intake","energy-anomaly-monitoring/happy-anomaly-loop/fdig/oversee","energy-anomaly-monitoring/exception-datagap-reconcile/fdig/oversee","annual-maintenance-renewal/renew-happy/fdig/assess","annual-maintenance-renewal/exit-handover/fdig/assess"]],
["jargon-lint", ["impl-migration/dir-c-bills/field/handover-docs","impl-migration/dir-a-singlelamp/field/handover-docs","impl-migration/dir-b-cetc-box/field/handover-docs"]],
["jargon-lint", ["impl-migration/dir-c-bills/field/handover-docs","impl-migration/dir-a-singlelamp/field/handover-docs","impl-migration/dir-b-cetc-box/field/handover-docs"]],
["jargon-lint", ["impl-migration/dir-c-bills/field/pilot","impl-migration/dir-a-singlelamp/field/pilot","impl-migration/dir-b-cetc-box/field/pilot"]],
["jargon-lint", ["accounts-training-onboarding/onboarding/qingyi/accounts","accounts-training-onboarding/onboarding/qingyi/training","accounts-training-onboarding/onboarding/qingyi/trial-upload"]],
["jargon-lint", ["accounts-training-onboarding/onboarding/qingyi/training","accounts-training-onboarding/onboarding/delivery/training"]],
["jargon-lint", ["daily-inspection/happy-lamp-onsite/field/schedule","daily-inspection/exception-boxside-offline/field/schedule"]],
["jargon-lint", ["daily-inspection/happy-lamp-onsite/field/patrol","daily-inspection/happy-lamp-onsite/field/check","daily-inspection/happy-lamp-onsite/field/close","daily-inspection/exception-boxside-offline/field/patrol","daily-inspection/exception-boxside-offline/field/close"]],
["jargon-lint", ["daily-inspection/happy-lamp-onsite/field/close","energy-anomaly-monitoring/happy-anomaly-loop/field/handle","replace-retrofit-exit/approved-recovered/fdig/report","replace-retrofit-exit/rejected-carryover/fdig/report"]],
["jargon-lint", ["daily-inspection/exception-boxside-offline/field/check","daily-inspection/exception-boxside-offline/field/attribute"]],
["jargon-lint", ["assessment-reporting-loop/on-target-close/gov/define-profile","assessment-reporting-loop/rectification-reject-branch/gov/define-profile","energy-anomaly-monitoring/happy-anomaly-loop/gov/oversee","energy-anomaly-monitoring/exception-datagap-reconcile/gov/oversee","energy-anomaly-monitoring/happy-anomaly-loop/fdig/oversee","annual-maintenance-renewal/renew-happy/fdig/assess","annual-maintenance-renewal/exit-handover/fdig/assess"]],
["jargon-lint", ["energy-anomaly-monitoring/happy-anomaly-loop/gov/oversee"]],
["jargon-lint", ["energy-anomaly-monitoring/exception-datagap-reconcile/gov/oversee"]],
];
for (const [check, keys] of payloads) {
  const p = keys.slice().sort().join('\n');
  console.log(`${check}:${crypto.createHash('sha256').update(p).digest('hex')}`);
}
