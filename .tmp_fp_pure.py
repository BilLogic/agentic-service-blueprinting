import json, uuid

def rotr(x, n):
    return ((x >> n) | (x << (32 - n))) & 0xFFFFFFFF

def sha256(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]
    H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
    orig_len = len(data)
    data = bytearray(data)
    data.append(0x80)
    while len(data) % 64 != 56:
        data.append(0)
    data += orig_len.to_bytes(8, 'big')
    for chunk_start in range(0, len(data), 64):
        chunk = data[chunk_start:chunk_start + 64]
        w = [0] * 64
        for i in range(16):
            w[i] = int.from_bytes(chunk[i * 4:i * 4 + 4], 'big')
        for i in range(16, 64):
            s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >> 3)
            s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >> 10)
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & 0xFFFFFFFF
        a, b, c, d, e, f, g, h = H
        for i in range(64):
            S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
            ch = (e & f) ^ ((~e & 0xFFFFFFFF) & g)
            temp1 = (h + S1 + ch + K[i] + w[i]) & 0xFFFFFFFF
            S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
            maj = (a & b) ^ (a & c) ^ (b & c)
            temp2 = (S0 + maj) & 0xFFFFFFFF
            h, g, f, e, d, c, b, a = g, f, e, (d + temp1) & 0xFFFFFFFF, c, b, a, (temp1 + temp2) & 0xFFFFFFFF
        H = [(H[i] + v) & 0xFFFFFFFF for i, v in enumerate([a, b, c, d, e, f, g, h])]
    return ''.join(f'{x:08x}' for x in H)

def fp(check, keys):
    s = "\n".join(sorted(keys))
    return check + ":" + sha256(s)

assert sha256("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9639c0293af6f6f4f"

sets = [
("gap-sweep", ["fault-repair-closed-loop/happy-lamp-side/fdig/intake","fault-repair-closed-loop/happy-lamp-side/fdig/push","fault-repair-closed-loop/happy-lamp-side/citizen/dispatch"]),
("gap-sweep", ["fault-repair-closed-loop/exception-box-side/fdig/intake","fault-repair-closed-loop/exception-box-side/fdig/push","fault-repair-closed-loop/exception-box-side/citizen/dispatch"]),
("gap-sweep", ["annual-maintenance-renewal/renew-happy/gov/report"]),
("gap-sweep", ["annual-maintenance-renewal/exit-handover/gov/report"]),
("jargon-lint", ["bid-win-entry/bid-entry-main/front/spot-opportunity"]),
("jargon-lint", ["bid-win-entry/bid-entry-main/gov/spot-opportunity","bid-win-entry/bid-entry-main/front/spot-opportunity"]),
("jargon-lint", ["bid-win-entry/bid-entry-main/gov/lamp-bid","bid-win-entry/bid-entry-main/front/lamp-bid"]),
("jargon-lint", ["bid-win-entry/bid-entry-main/gov/platform-proposal","bid-win-entry/bid-entry-main/front/platform-proposal","bid-win-entry/bid-entry-main/fdig/platform-proposal"]),
("jargon-lint", ["bid-win-entry/bid-entry-main/front/platform-proposal","bid-win-entry/bid-entry-main/fdig/platform-proposal"]),
("jargon-lint", ["bid-win-entry/bid-entry-main/gov/spot-opportunity"]),
("jargon-lint", ["procurement-single-path/procurement-happy/front/initiation"]),
("jargon-lint", ["procurement-single-path/procurement-happy/gov/initiation"]),
("jargon-lint", ["procurement-single-path/procurement-happy/gov/tender"]),
("jargon-lint", ["procurement-single-path/procurement-happy/gov/contract","procurement-single-path/procurement-happy/front/contract"]),
("jargon-lint", ["impl-migration/dir-c-bills/gov/accept","impl-migration/dir-a-singlelamp/gov/accept","impl-migration/dir-b-cetc-box/gov/accept","daily-inspection/happy-lamp-onsite/field/check","daily-inspection/exception-boxside-offline/field/check"]),
("jargon-lint", ["impl-migration/dir-c-bills/gov/accept","impl-migration/dir-a-singlelamp/gov/accept","impl-migration/dir-b-cetc-box/gov/accept"]),
("jargon-lint", ["impl-migration/dir-c-bills/field/pilot","impl-migration/dir-a-singlelamp/field/pilot","impl-migration/dir-b-cetc-box/field/pilot","impl-migration/dir-c-bills/gov/accept","impl-migration/dir-a-singlelamp/gov/accept","impl-migration/dir-b-cetc-box/gov/accept","fault-repair-closed-loop/happy-lamp-side/citizen/report","fault-repair-closed-loop/happy-lamp-side/fdig/intake","energy-anomaly-monitoring/happy-anomaly-loop/fdig/oversee","energy-anomaly-monitoring/exception-datagap-reconcile/fdig/oversee","annual-maintenance-renewal/renew-happy/fdig/assess","annual-maintenance-renewal/exit-handover/fdig/assess"]),
("jargon-lint", ["impl-migration/dir-c-bills/field/handover-docs","impl-migration/dir-a-singlelamp/field/handover-docs","impl-migration/dir-b-cetc-box/field/handover-docs"]),
("jargon-lint", ["impl-migration/dir-c-bills/field/handover-docs","impl-migration/dir-a-singlelamp/field/handover-docs","impl-migration/dir-b-cetc-box/field/handover-docs"]),
("jargon-lint", ["impl-migration/dir-c-bills/field/pilot","impl-migration/dir-a-singlelamp/field/pilot","impl-migration/dir-b-cetc-box/field/pilot"]),
("jargon-lint", ["accounts-training-onboarding/onboarding/qingyi/accounts","accounts-training-onboarding/onboarding/qingyi/training","accounts-training-onboarding/onboarding/qingyi/trial-upload"]),
("jargon-lint", ["accounts-training-onboarding/onboarding/qingyi/training","accounts-training-onboarding/onboarding/delivery/training"]),
("jargon-lint", ["daily-inspection/happy-lamp-onsite/field/schedule","daily-inspection/exception-boxside-offline/field/schedule"]),
("jargon-lint", ["daily-inspection/happy-lamp-onsite/field/patrol","daily-inspection/happy-lamp-onsite/field/check","daily-inspection/happy-lamp-onsite/field/close","daily-inspection/exception-boxside-offline/field/patrol","daily-inspection/exception-boxside-offline/field/close"]),
("jargon-lint", ["daily-inspection/happy-lamp-onsite/field/close","energy-anomaly-monitoring/happy-anomaly-loop/field/handle","replace-retrofit-exit/approved-recovered/fdig/report","replace-retrofit-exit/rejected-carryover/fdig/report"]),
("jargon-lint", ["daily-inspection/exception-boxside-offline/field/check","daily-inspection/exception-boxside-offline/field/attribute"]),
("jargon-lint", ["assessment-reporting-loop/on-target-close/gov/define-profile","assessment-reporting-loop/rectification-reject-branch/gov/define-profile","energy-anomaly-monitoring/happy-anomaly-loop/gov/oversee","energy-anomaly-monitoring/exception-datagap-reconcile/gov/oversee","energy-anomaly-monitoring/happy-anomaly-loop/fdig/oversee","annual-maintenance-renewal/renew-happy/fdig/assess","annual-maintenance-renewal/exit-handover/fdig/assess"]),
("jargon-lint", ["energy-anomaly-monitoring/happy-anomaly-loop/gov/oversee"]),
("jargon-lint", ["energy-anomaly-monitoring/exception-datagap-reconcile/gov/oversee"]),
]

out = {"run_id": str(uuid.uuid4()), "fps": [fp(c, k) for c, k in sets]}
with open("/Users/billguo/Desktop/agentic-service-blueprinting/.tmp_fp_out.json", "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
