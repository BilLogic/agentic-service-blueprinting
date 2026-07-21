#!/usr/bin/env bash
# Round-trip tests for the Phase 1 IR scripts:
#   scripts/validate_ir.py, scripts/generate_seed_sql.py,
#   scripts/generate_fallbacks.py
#
# Usage: bash scripts/tests/run_tests.sh
#
# Covers: validator pass on the bilingual sample fixture; validator FAIL with
# the right messages on three crafted-bad mutations; YAML-support branch;
# seed SQL for en + zh (transaction wrapper, balanced quotes, insert order,
# deterministic UUIDv5 ids across runs, per-locale divergence, --verify
# companion); generators refusing an invalid IR without writing output;
# fallback TS generation + `tsc` type-check + --register round-trip against
# src/data/blueprintFallbacks.ts (restored afterwards).
#
# Requires: python3 (stdlib only) and the repo's node_modules (for tsc).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SAMPLE="$SCRIPT_DIR/sample-ir.json"
VALIDATE="$REPO_ROOT/scripts/validate_ir.py"
SEED_GEN="$REPO_ROOT/scripts/generate_seed_sql.py"
FALLBACK_GEN="$REPO_ROOT/scripts/generate_fallbacks.py"
REGISTRY="$REPO_ROOT/src/data/blueprintFallbacks.ts"
GENERATED_TS="$REPO_ROOT/src/data/generatedBlueprints.ts"
NAV="$REPO_ROOT/src/types/nav.ts"

TMP="$(mktemp -d)"
PASS_COUNT=0

# Snapshot app files the --register test mutates, and restore them on exit.
cp "$REGISTRY" "$TMP/blueprintFallbacks.ts.bak"
cp "$NAV" "$TMP/nav.ts.bak"
GENERATED_TS_EXISTED=0
if [ -f "$GENERATED_TS" ]; then
  GENERATED_TS_EXISTED=1
  cp "$GENERATED_TS" "$TMP/generatedBlueprints.ts.bak"
fi

cleanup() {
  cp "$TMP/blueprintFallbacks.ts.bak" "$REGISTRY"
  cp "$TMP/nav.ts.bak" "$NAV"
  if [ "$GENERATED_TS_EXISTED" = 1 ]; then
    cp "$TMP/generatedBlueprints.ts.bak" "$GENERATED_TS"
  else
    rm -f "$GENERATED_TS"
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "PASS  $1"
}

fail() {
  echo "FAIL  $1" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# 1. Validator accepts the bilingual sample fixture
# ---------------------------------------------------------------------------

python3 "$VALIDATE" "$SAMPLE" > "$TMP/valid.out" 2>&1 \
  || fail "validator-sample: expected exit 0, got $? — $(cat "$TMP/valid.out")"
grep -q "OK" "$TMP/valid.out" || fail "validator-sample: no OK line"
pass "validator-sample (bilingual fixture validates cleanly)"

# ---------------------------------------------------------------------------
# 2. Validator rejects three crafted-bad mutations with the right messages
# ---------------------------------------------------------------------------

python3 - "$SAMPLE" "$TMP" <<'PY'
import json, sys
sample_path, tmp = sys.argv[1], sys.argv[2]
base = json.load(open(sample_path, encoding="utf-8"))
scenario = lambda d: d["lifecycle"]["phases"][0]["scenarios"][0]

# bad1: cell referencing a scenario step absent from the path's path_steps
# ('archive' is not on as-done) — the DB-trigger preview case.
bad = json.loads(json.dumps(base))
scenario(bad)["paths"][1]["cells"].append(
    {"layer": "compliance", "step": "archive", "content": {"en": "x", "zh": "x"}}
)
json.dump(bad, open(f"{tmp}/bad1.json", "w", encoding="utf-8"), ensure_ascii=False)

# bad2: duplicate step in path_steps (duplicate column_position).
bad = json.loads(json.dumps(base))
scenario(bad)["paths"][0]["path_steps"].append("report")
json.dump(bad, open(f"{tmp}/bad2.json", "w", encoding="utf-8"), ensure_ascii=False)

# bad3: cross-path trigger — (field-tech, verify) is a cell on as-done only,
# referenced from a trigger on as-designed.
bad = json.loads(json.dumps(base))
scenario(bad)["paths"][0]["triggers"].append(
    {
        "source": {"layer": "citizen", "step": "report"},
        "target": {"layer": "field-tech", "step": "verify"},
    }
)
json.dump(bad, open(f"{tmp}/bad3.json", "w", encoding="utf-8"), ensure_ascii=False)
PY

expect_invalid() {
  local name="$1" file="$2" needle="$3"
  if python3 "$VALIDATE" "$file" > "$TMP/$name.out" 2>&1; then
    fail "$name: expected non-zero exit"
  fi
  grep -q "$needle" "$TMP/$name.out" \
    || fail "$name: expected message containing '$needle' — got: $(cat "$TMP/$name.out")"
  pass "$name"
}

expect_invalid "validator-bad1 (cell step missing from path_steps)" "$TMP/bad1.json" "cells_validate_path_match"
expect_invalid "validator-bad2 (duplicate column_position in path_steps)" "$TMP/bad2.json" "duplicate step 'report' in path_steps"
expect_invalid "validator-bad3 (cross-path trigger)" "$TMP/bad3.json" "cross-path triggers are invalid"

# ---------------------------------------------------------------------------
# 3. YAML branch: native JSON always works; YAML needs PyYAML (clear message)
# ---------------------------------------------------------------------------

if python3 -c "import yaml" 2>/dev/null; then
  python3 -c '
import json, sys, yaml
doc = json.load(open(sys.argv[1], encoding="utf-8"))
yaml.safe_dump(doc, open(sys.argv[2], "w", encoding="utf-8"), allow_unicode=True)
' "$SAMPLE" "$TMP/sample.yaml"
  python3 "$VALIDATE" "$TMP/sample.yaml" > "$TMP/yaml.out" 2>&1 \
    || fail "validator-yaml: PyYAML present but YAML IR failed — $(cat "$TMP/yaml.out")"
  pass "validator-yaml (PyYAML present: YAML IR validates)"
else
  printf 'schema_version: "1"\n' > "$TMP/sample.yaml"
  if python3 "$VALIDATE" "$TMP/sample.yaml" > "$TMP/yaml.out" 2>&1; then
    fail "validator-yaml: expected non-zero exit without PyYAML"
  fi
  grep -q "PyYAML" "$TMP/yaml.out" || fail "validator-yaml: no PyYAML fallback message"
  pass "validator-yaml (no PyYAML: clear fallback message, JSON stays native)"
fi

# ---------------------------------------------------------------------------
# 4. Seed SQL: en + zh, wrapper, quoting, insert order, determinism, --verify
# ---------------------------------------------------------------------------

python3 "$SEED_GEN" "$SAMPLE" --locale en --out "$TMP/seed.en.sql" --verify > /dev/null \
  || fail "seed-en: generation failed"
python3 "$SEED_GEN" "$SAMPLE" --locale zh --out "$TMP/seed.zh.sql" --verify > /dev/null \
  || fail "seed-zh: generation failed"
[ -f "$TMP/seed.en.verify.sql" ] || fail "seed-verify: en companion missing"
[ -f "$TMP/seed.zh.verify.sql" ] || fail "seed-verify: zh companion missing"
pass "seed-generate (en + zh + --verify companions)"

python3 - "$TMP/seed.en.sql" "$TMP/seed.zh.sql" <<'PY'
import re, sys

TABLE_ORDER = ["paths", "steps", "path_steps", "layers", "cells", "cell_triggers"]

for path in sys.argv[1:]:
    sql = open(path, encoding="utf-8").read()
    body = "\n".join(
        line for line in sql.splitlines() if not line.lstrip().startswith("--")
    )

    # Transaction wrapper.
    assert body.lstrip().startswith("begin;"), f"{path}: missing begin; wrapper"
    assert body.rstrip().endswith("commit;"), f"{path}: missing trailing commit;"
    assert body.count("begin;") == 1 and body.count("commit;") == 1, f"{path}: not one transaction"

    # Balanced single quotes (every literal contributes an even count once
    # doubled quotes are counted as two characters).
    quotes = body.count("'")
    assert quotes % 2 == 0, f"{path}: unbalanced single quotes ({quotes})"

    # Scenario-replace before any scenario-child insert; dependency order.
    delete_pos = body.index("delete from public.service_scenarios")
    positions = [body.index(f"insert into public.{t} ") for t in TABLE_ORDER]
    assert delete_pos < min(positions), f"{path}: delete must precede child inserts"
    assert positions == sorted(positions), f"{path}: insert order violates paths->steps->path_steps->layers->cells->cell_triggers"

    # Lifecycle/phases are upserts; scenario children are plain inserts.
    assert body.count("on conflict (id) do update") == 2, f"{path}: lifecycle+phases must be the only upserts"

en = open(sys.argv[1], encoding="utf-8").read()
zh = open(sys.argv[2], encoding="utf-8").read()
assert "Submit repair ticket" in en, "en seed missing en content"
assert "提交报修工单" in zh, "zh seed missing zh content"
assert en != zh, "en and zh seeds must differ"

# Locale-scoped UUIDv5: no shared entity ids between locale artifact sets.
uuid_re = re.compile(r"'[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'")
assert not (set(uuid_re.findall(en)) & set(uuid_re.findall(zh))), "en/zh UUID sets overlap"

verify = open(sys.argv[1].replace(".sql", ".verify.sql"), encoding="utf-8").read()
for needle in ("do $$", "path_steps", "cell_triggers", "raise exception"):
    assert needle in verify, f"verify sql missing {needle!r}"
PY
pass "seed-assertions (wrapper, balanced quotes, insert order, locale content, verify checks)"

python3 "$SEED_GEN" "$SAMPLE" --locale en --out "$TMP/seed.en.2.sql" > /dev/null
diff -q "$TMP/seed.en.sql" "$TMP/seed.en.2.sql" > /dev/null \
  || fail "seed-deterministic: two runs differ"
pass "seed-deterministic (identical output across runs — idempotent UUIDv5 ids)"

if python3 "$SEED_GEN" "$TMP/bad1.json" --locale en --out "$TMP/seed.bad.sql" > /dev/null 2>&1; then
  fail "seed-invalid-ir: expected refusal"
fi
[ ! -f "$TMP/seed.bad.sql" ] || fail "seed-invalid-ir: output written despite invalid IR"
pass "seed-invalid-ir (invalid IR generates nothing — target untouched)"

# ---------------------------------------------------------------------------
# 5. Fallback TS module: generate, type-check, determinism, --register
# ---------------------------------------------------------------------------

cd "$REPO_ROOT"

python3 "$FALLBACK_GEN" "$SAMPLE" --locale en --out "$GENERATED_TS" > /dev/null \
  || fail "fallback-generate: generation failed"
python3 "$FALLBACK_GEN" "$SAMPLE" --locale en --out "$TMP/generated.2.ts" > /dev/null
diff -q "$GENERATED_TS" "$TMP/generated.2.ts" > /dev/null \
  || fail "fallback-deterministic: two runs differ"
pass "fallback-deterministic (identical output across runs)"

python3 - "$GENERATED_TS" "$TMP/seed.en.sql" <<'PY'
import re, sys
ts = open(sys.argv[1], encoding="utf-8").read()
sql = open(sys.argv[2], encoding="utf-8").read()
assert "现场技术员" in ts, "generated TS missing CJK content"
uuid_re = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")
ts_ids, sql_ids = set(uuid_re.findall(ts)), set(uuid_re.findall(sql))
missing = ts_ids - sql_ids
assert not missing, f"adapter parity broken — TS ids missing from seed SQL: {sorted(missing)[:3]}"
PY
pass "fallback-parity (same UUIDv5 ids as the en seed SQL — adapter parity)"

npx tsc -p tsconfig.app.json > "$TMP/tsc1.out" 2>&1 \
  || fail "fallback-tsc: type-check failed with generated module present — $(tail -20 "$TMP/tsc1.out")"
pass "fallback-tsc (generated module is tsc-clean, CJK strings escaped safely)"

python3 "$FALLBACK_GEN" "$SAMPLE" --locale en --out "$GENERATED_TS" --register > /dev/null \
  || fail "fallback-register: --register failed"
grep -q "from '@/data/generatedBlueprints'" "$REGISTRY" \
  || fail "fallback-register: registry does not import the generated module"
grep -q "GENERATED-BLUEPRINT-REGISTRY:BEGIN" "$REGISTRY" \
  || fail "fallback-register: BEGIN marker lost"
grep -q "GENERATED-BLUEPRINT-REGISTRY:END" "$REGISTRY" \
  || fail "fallback-register: END marker lost"
npx tsc -p tsconfig.app.json > "$TMP/tsc2.out" 2>&1 \
  || fail "fallback-register-tsc: type-check failed after --register — $(tail -20 "$TMP/tsc2.out")"
pass "fallback-register (marker block rewritten; app type-checks against generated registry)"

# --register also regenerates the offline nav (FALLBACK_NAV) from the IR lifecycle.
grep -q "GENERATED-NAV:BEGIN" "$NAV" || fail "nav-register: NAV BEGIN marker lost"
grep -q "GENERATED-NAV:END" "$NAV" || fail "nav-register: NAV END marker lost"
# Generated form drops the sample-only import + phase-id consts.
grep -q "SAMPLE_SCENARIO_ID" "$NAV" && fail "nav-register: sample import survived regeneration"
# Nav references the IR's scenario UUIDs (adapter parity with the generated module).
python3 - "$NAV" "$GENERATED_TS" <<'PY'
import re, sys
nav = open(sys.argv[1], encoding="utf-8").read()
mod = open(sys.argv[2], encoding="utf-8").read()
uuid_re = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")
block = nav.split("GENERATED-NAV:BEGIN", 1)[1].split("GENERATED-NAV:END", 1)[0]
nav_ids = set(uuid_re.findall(block))
assert nav_ids, "regenerated FALLBACK_NAV has no UUIDs"
scenario_ids = set(uuid_re.findall(mod))
# phase ids won't appear in the blueprint module; require at least the scenarios present.
assert nav_ids & scenario_ids, f"nav shares no ids with the generated module: {sorted(nav_ids)[:3]}"
PY
pass "nav-register (FALLBACK_NAV regenerated from the IR lifecycle; markers kept)"

# Idempotent re-register (registry + nav).
python3 "$FALLBACK_GEN" "$SAMPLE" --locale en --out "$GENERATED_TS" --register > /dev/null
cp "$REGISTRY" "$TMP/registry.after2.ts"
cp "$NAV" "$TMP/nav.after2.ts"
python3 "$FALLBACK_GEN" "$SAMPLE" --locale en --out "$GENERATED_TS" --register > /dev/null
diff -q "$REGISTRY" "$TMP/registry.after2.ts" > /dev/null \
  || fail "fallback-reregister: re-running --register changed the registry"
diff -q "$NAV" "$TMP/nav.after2.ts" > /dev/null \
  || fail "nav-reregister: re-running --register changed nav.ts"
pass "fallback-reregister (re-registration is a no-op — idempotent, registry + nav)"

if python3 "$FALLBACK_GEN" "$TMP/bad1.json" --locale en --out "$TMP/generated.bad.ts" > /dev/null 2>&1; then
  fail "fallback-invalid-ir: expected refusal"
fi
[ ! -f "$TMP/generated.bad.ts" ] || fail "fallback-invalid-ir: output written despite invalid IR"
pass "fallback-invalid-ir (invalid IR generates nothing)"

# Restore the shipped registry + nav state and confirm they still type-check.
cp "$TMP/blueprintFallbacks.ts.bak" "$REGISTRY"
cp "$TMP/nav.ts.bak" "$NAV"
rm -f "$GENERATED_TS"
npx tsc -p tsconfig.app.json > "$TMP/tsc3.out" 2>&1 \
  || fail "restore-tsc: default registry no longer type-checks — $(tail -20 "$TMP/tsc3.out")"
pass "restore-tsc (default scale-fixture registry + nav restored and type-check)"

echo
echo "All $PASS_COUNT tests passed."
