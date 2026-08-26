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
# src/data/blueprintFallbacks.ts (restored afterwards); schema-version
# migration (a superseded IR is refused by name, migrate_ir.py carries it
# forward, and a signed scenario's sign-off hash is re-anchored, not dropped).
#
# Requires: python3 (stdlib only) and the repo's node_modules (for tsc).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SAMPLE="$SCRIPT_DIR/sample-ir.json"
SAMPLE_OLD="$SCRIPT_DIR/sample-ir-2026.07.16.json"
VALIDATE="$REPO_ROOT/scripts/validate_ir.py"
MIGRATE="$REPO_ROOT/scripts/migrate_ir.py"
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
scenario = lambda d: d["service"]["phases"][0]["scenarios"][0]

# bad1: cell referencing a scenario step absent from the path's path_steps
# ('archive' is not on as-done) — the DB-trigger preview case.
bad = json.loads(json.dumps(base))
scenario(bad)["paths"][1]["cells"].append(
    {"lane": "compliance", "step": "archive", "content": {"en": "x", "zh": "x"}}
)
json.dump(bad, open(f"{tmp}/bad1.json", "w", encoding="utf-8"), ensure_ascii=False)

# bad2: duplicate step in path_steps (duplicate position).
bad = json.loads(json.dumps(base))
scenario(bad)["paths"][0]["path_steps"].append("report")
json.dump(bad, open(f"{tmp}/bad2.json", "w", encoding="utf-8"), ensure_ascii=False)

# bad3: cross-path trigger — (field-tech, verify) is a cell on as-done only,
# referenced from a trigger on as-designed.
bad = json.loads(json.dumps(base))
scenario(bad)["paths"][0]["triggers"].append(
    {
        "source": {"lane": "citizen", "step": "report"},
        "target": {"lane": "field-tech", "step": "verify"},
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
expect_invalid "validator-bad2 (duplicate position in path_steps)" "$TMP/bad2.json" "duplicate step 'report' in path_steps"
expect_invalid "validator-bad3 (cross-path trigger)" "$TMP/bad3.json" "cross-path triggers are invalid"

# The version field was checked for being a STRING and nothing else, so an IR
# authored against a shape the database does not have validated cleanly.
python3 - "$SAMPLE" "$TMP" <<'PY'
import json, sys
tmp = sys.argv[2]
doc = json.load(open(sys.argv[1], encoding="utf-8"))
doc["schema_version"] = "1999.01.01"
json.dump(doc, open(f"{tmp}/bad-version.json", "w", encoding="utf-8"), ensure_ascii=False)
PY
expect_invalid "validator-schema-version (unknown version rejected by name)" "$TMP/bad-version.json" "unknown schema_version"
python3 "$VALIDATE" "$TMP/bad-version.json" > "$TMP/bad-version.out" 2>&1 || true
grep -q "migrate_ir.py" "$TMP/bad-version.out" \
  || fail "validator-schema-version: the message must say where the migration steps live"

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

TABLE_ORDER = ["paths", "steps", "path_steps", "lanes", "cells", "cell_dependencies"]

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
    delete_pos = body.index("delete from public.scenarios")
    positions = [body.index(f"insert into public.{t} ") for t in TABLE_ORDER]
    assert delete_pos < min(positions), f"{path}: delete must precede child inserts"
    assert positions == sorted(positions), f"{path}: insert order violates paths->steps->path_steps->lanes->cells->cell_dependencies"

    # Service/phases are upserts; scenario children are plain inserts.
    assert body.count("on conflict (id) do update") == 2, f"{path}: service+phases must be the only upserts"

en = open(sys.argv[1], encoding="utf-8").read()
zh = open(sys.argv[2], encoding="utf-8").read()
assert "Submit repair ticket" in en, "en seed missing en content"
assert "提交报修工单" in zh, "zh seed missing zh content"
assert en != zh, "en and zh seeds must differ"

# Locale-scoped UUIDv5: no shared entity ids between locale artifact sets.
uuid_re = re.compile(r"'[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'")
assert not (set(uuid_re.findall(en)) & set(uuid_re.findall(zh))), "en/zh UUID sets overlap"

verify = open(sys.argv[1].replace(".sql", ".verify.sql"), encoding="utf-8").read()
for needle in ("do $$", "path_steps", "cell_dependencies", "raise exception"):
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
# 4b. Schema parity: cell_key, position, spec fields, trigger kind,
#     derived-row reporting (authoring_foundation + derived_layer migrations)
# ---------------------------------------------------------------------------

# cell_key: emitted for every cell, deterministic, collision-free, and
# byte-identical to BOTH the UUIDv5 input and the slice tooling's convention
# (service/phase/scenario/path/lane/step).
python3 - "$REPO_ROOT" "$SAMPLE" "$TMP/seed.en.sql" <<'PY' \
  || fail "seed-cell-key: cell_key emission broke parity"
import json, sys
repo, sample, seed_path = sys.argv[1:4]
sys.path.insert(0, f"{repo}/scripts")
sys.path.insert(0, f"{repo}/skills/slice/scripts")
from generate_seed_sql import build_model, entity_uuid
import slice_tools

doc = json.load(open(sample, encoding="utf-8"))
model = build_model(doc, "en")
keys = []
for sc in model["scenarios"]:
    for p in sc["paths"]:
        for c in p["cells"]:
            keys.append(c["cell_key"])
            # The stored key IS the UUIDv5 input: id must re-derive from it.
            assert entity_uuid("en", "cell", c["cell_key"]) == c["id"], \
                f"cell_key does not re-derive the cell id: {c['cell_key']}"
            assert c["cell_key"].startswith(sc["qualified_key"] + "/"), \
                f"cell_key missing scenario prefix: {c['cell_key']}"
assert len(keys) == len(set(keys)), "cell_key collision on the sample IR"

# Convention parity with the slice tooling (the consumer of these keys).
index = slice_tools.index_ir(doc)
k = slice_tools.cell_key(index, "operate/asset-repair", "as-designed", "citizen", "report")
assert k in keys, f"slice_tools convention diverged: {k}"

# And every key is actually written into the seed SQL's cells insert.
seed = open(seed_path, encoding="utf-8").read()
assert "cell_key" in seed.split("insert into public.cells ", 1)[1].split(") values", 1)[0], \
    "cells insert has no cell_key column"
for key in keys:
    assert f"'{key}'" in seed, f"cell_key missing from seed SQL: {key}"
PY
pass "seed-cell-key (deterministic, collision-free, uuid- and slice-tooling parity)"

# Spec fields: pass through when the IR carries them; default when absent.
python3 - "$TMP/seed.en.sql" <<'PY' || fail "seed-spec-fields: spec-field passthrough broken"
import sys
seed = open(sys.argv[1], encoding="utf-8").read()

cells_stmt = seed.split("insert into public.cells ", 1)[1].split(";\n", 1)[0]
cols = cells_stmt.split(") values", 1)[0]
for col in ("position", "cell_key", "function", "form", "value_props", "owner", "perceived_owner"):
    assert col in cols, f"cells insert missing column {col}"

# Values from the sample IR's spec-annotated cells (citizen/report as-designed
# carries all five; backstage-tech/triage as-done carries owner only).
assert "Capture the fault with enough detail" in seed, "function value missing"
assert "Mobile web form with photo upload" in seed, "form value missing"
assert "'city-311'" in seed, "owner value missing"
assert "the city''s repair crew" in seed, "perceived_owner value missing (or quote-doubling broken)"
assert '"for": "citizen"' in seed and "Fault logged without waiting on hold" in seed, \
    "value_props jsonb missing"
assert "'maintenance-contractor'" in seed, "partial spec cell (owner only) missing"
# Cells without spec fields fall back to null / empty jsonb array defaults.
assert ", null, null, '[]'::jsonb, null, null)" in seed, \
    "spec-less cells should emit null/null/[]/null/null"

lanes_stmt = seed.split("insert into public.lanes ", 1)[1].split(";\n", 1)[0]
assert "kpis" in lanes_stmt and "tools" in lanes_stmt, "lanes insert missing kpis/tools"
assert "mean-time-to-repair" in lanes_stmt, "lane kpis value missing"
assert "FieldOps app" in lanes_stmt, "lane tools value missing"
PY
pass "seed-spec-fields (cells + lanes wave-2 fields pass through; absent -> defaults)"

# Trigger kind: every IR trigger is temporal — kind='trigger' emitted explicitly.
python3 - "$TMP/seed.en.sql" <<'PY' || fail "seed-trigger-kind: kind emission broken"
import sys
seed = open(sys.argv[1], encoding="utf-8").read()
stmt = seed.split("insert into public.cell_dependencies ", 1)[1].split(";\n", 1)[0]
assert "kind" in stmt.split(") values", 1)[0], "cell_dependencies insert missing kind column"
rows = [r for r in stmt.split(") values", 1)[1].splitlines() if r.strip().startswith("(")]
assert rows and all("'trigger'" in r for r in rows), "every trigger row must emit kind='trigger'"
assert "'needs'" not in stmt, "IR cannot author needs edges — none may be emitted"
PY
pass "seed-trigger-kind (cell_dependencies emit kind='trigger'; no needs edges from IR)"

# --verify: cell_key checks fail loudly; derived rows are reported, never failed.
python3 - "$TMP/seed.en.verify.sql" <<'PY' || fail "verify-derived-report: verify script coverage broken"
import sys
verify = open(sys.argv[1], encoding="utf-8").read()
assert "cell_key" in verify, "verify has no cell_key checks"
assert "missing the authored cell_key prefix" in verify, "verify missing cell_key prefix check"
assert "cell_key mismatch" in verify, "verify missing cell_key spot-check"
# Derived-layer section: present, guarded, and notice-only.
for table in ("slice_items", "findings", "evidence", "slices", "propositions"):
    assert f"to_regclass('public.{table}')" in verify, f"derived report missing {table}"
derived = verify.split("to_regclass", 1)[1]
assert "raise notice" in derived, "derived section must report via notice"
assert "raise exception" not in derived, "derived rows must never fail verification"
PY
pass "verify-derived-report (cell_key verified; derived rows reported, not failed)"

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

# --register also regenerates the offline nav (FALLBACK_NAV) from the IR service.
grep -q "GENERATED-NAV:BEGIN" "$NAV" || fail "nav-register: NAV BEGIN marker lost"
grep -q "GENERATED-NAV:END" "$NAV" || fail "nav-register: NAV END marker lost"
# Generated form drops the sample-only import + phase-id consts. Grep the
# import specifier, not the symbol: the symbol moved out of nav.ts long ago,
# which made this check vacuous.
grep -q "@/data/sampleBlueprint" "$NAV" && fail "nav-register: sample import survived regeneration"
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
pass "nav-register (FALLBACK_NAV regenerated from the IR service; markers kept)"

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

# ---------------------------------------------------------------------------
# 6. Per-scenario sign-off hash (friction #19)
# ---------------------------------------------------------------------------

SIGNOFF_GEN="$REPO_ROOT/scripts/compute_signoff_hash.py"

H1="$(python3 "$SIGNOFF_GEN" "$SAMPLE")"
H2="$(python3 "$SIGNOFF_GEN" "$SAMPLE")"
[ "$H1" = "$H2" ] || fail "signoff-deterministic: two runs differ"
echo "$H1" | grep -qE 'asset-repair[[:space:]]+sha256:[0-9a-f]{64}' \
  || fail "signoff-format: expected '<key>\\tsha256:<hex>'"
pass "signoff-deterministic (stable per-scenario hash; sha256 format)"

# Editing a scenario changes ITS hash (content sensitivity).
python3 - "$SAMPLE" "$SIGNOFF_GEN" <<'PY' || fail "signoff-sensitivity: edit did not change the hash"
import json, subprocess, sys, tempfile, os
ir, gen = sys.argv[1], sys.argv[2]
base = subprocess.run([sys.executable, gen, ir], capture_output=True, text=True).stdout
doc = json.load(open(ir, encoding="utf-8"))
sc = doc["service"]["phases"][0]["scenarios"][0]
name = sc["name"]
if isinstance(name, dict):
    k = next(iter(name)); name[k] = name[k] + " EDIT"
else:
    sc["name"] = name + " EDIT"
tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
json.dump(doc, tmp, ensure_ascii=False); tmp.close()
after = subprocess.run([sys.executable, gen, tmp.name], capture_output=True, text=True).stdout
os.unlink(tmp.name)
sys.exit(0 if base != after else 1)
PY
pass "signoff-sensitivity (editing a scenario changes its content hash)"

# --scenario filter + missing-key error.
python3 "$SIGNOFF_GEN" "$SAMPLE" --scenario asset-repair --json | grep -q '"asset-repair"' \
  || fail "signoff-filter: --scenario --json did not emit the key"
if python3 "$SIGNOFF_GEN" "$SAMPLE" --scenario nope > /dev/null 2>&1; then
  fail "signoff-missing: expected non-zero exit for an unknown scenario key"
fi
pass "signoff-filter (--scenario selects one; unknown key errors)"

# ---------------------------------------------------------------------------
# Slice tools
# ---------------------------------------------------------------------------

SLICE_TOOLS="$REPO_ROOT/skills/slice/scripts/slice_tools.py"
SLICE_FILE="$TMP/slices.json"

# select -> validate -> sql -> doc round trip.
python3 "$SLICE_TOOLS" select --ir "$SAMPLE" --scenario operate/asset-repair \
  --type journey --lane citizen --key citizen-repair --actor "Citizen" > "$SLICE_FILE" \
  || fail "slice-select: journey selection failed"
python3 "$SLICE_TOOLS" validate --ir "$SAMPLE" --slices "$SLICE_FILE" > /dev/null \
  || fail "slice-validate: generated skeleton did not validate"
pass "slice-select (journey skeleton validates)"

# The cell ids a slice emits MUST match the ids the seed generator writes —
# this is the whole contract between the derived layer and the blueprint.
python3 "$SEED_GEN" "$SAMPLE" --locale en --out "$TMP/seed-slice-check.sql" > /dev/null
python3 "$SLICE_TOOLS" sql --ir "$SAMPLE" --slices "$SLICE_FILE" --locale en \
  --service-id 11111111-1111-4111-8111-111111111111 > "$TMP/slice-en.sql" \
  || fail "slice-sql: emission failed"
python3 - "$TMP/slice-en.sql" "$TMP/seed-slice-check.sql" <<'PY' \
  || fail "slice-idmatch: a slice cell id is absent from the seed SQL"
import re, sys
slice_sql, seed_sql = (open(p, encoding="utf-8").read() for p in sys.argv[1:3])
ids = set(re.findall(r"array\[([^\]]*)\]::uuid\[\]", slice_sql))
cell_ids = {value.strip().strip("'") for group in ids for value in group.split(",") if value.strip()}
assert cell_ids, "no cell ids found in slice SQL"
missing = [cid for cid in cell_ids if cid not in seed_sql]
sys.exit(1 if missing else 0)
PY
pass "slice-idmatch (every slice cell id appears in the seed SQL)"

grep -q "^begin;" "$TMP/slice-en.sql" && grep -q "^commit;$" "$TMP/slice-en.sql" \
  || fail "slice-sql: missing transaction wrapper"
grep -q "delete from public.slices where id" "$TMP/slice-en.sql" \
  || fail "slice-sql: missing delete-then-insert replace"
pass "slice-sql (transactional replace)"

# Locales diverge (per-locale artifacts), keys do not.
python3 "$SLICE_TOOLS" sql --ir "$SAMPLE" --slices "$SLICE_FILE" --locale zh \
  --service-id 11111111-1111-4111-8111-111111111111 > "$TMP/slice-zh.sql"
if diff -q "$TMP/slice-en.sql" "$TMP/slice-zh.sql" > /dev/null; then
  fail "slice-locale: en and zh emitted identical SQL"
fi
pass "slice-locale (per-locale ids and text diverge)"

# Determinism: same inputs, same bytes.
python3 "$SLICE_TOOLS" sql --ir "$SAMPLE" --slices "$SLICE_FILE" --locale en \
  --service-id 11111111-1111-4111-8111-111111111111 > "$TMP/slice-en-2.sql"
diff -q "$TMP/slice-en.sql" "$TMP/slice-en-2.sql" > /dev/null \
  || fail "slice-determinism: two runs produced different SQL"
pass "slice-determinism (re-run is byte-identical)"

# Validation catches the three failures that would otherwise render as
# silently-wrong content rather than as errors.
python3 - "$SLICE_FILE" "$TMP/slice-bad.json" <<'PY'
import json, sys
doc = json.load(open(sys.argv[1], encoding="utf-8"))
entry = doc["slices"][0]
entry["frames"][0]["cells"].append(
    "streetlight-service/operate/asset-repair/as-designed/citizen/does-not-exist"
)
entry["frames"][-1]["cells"].append(entry["frames"][0]["cells"][0])
json.dump(doc, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
PY
if python3 "$SLICE_TOOLS" validate --ir "$SAMPLE" --slices "$TMP/slice-bad.json" > /dev/null 2>&1; then
  fail "slice-validate-bad: expected non-zero exit for unresolvable + duplicate cells"
fi
# Capture first: the validator exits non-zero by design, and `pipefail` would
# fail the pipeline even when grep matches.
python3 "$SLICE_TOOLS" validate --ir "$SAMPLE" --slices "$TMP/slice-bad.json" \
  > "$TMP/slice-bad.out" 2>&1 || true
grep -q "cell key not in IR" "$TMP/slice-bad.out" \
  || fail "slice-validate-bad: missing unresolvable-key message"
grep -q "appears twice" "$TMP/slice-bad.out" \
  || fail "slice-validate-bad: missing duplicate-cell message"
pass "slice-validate-bad (unresolvable key and duplicate cell both reported)"

# Emitters refuse an invalid slice file — no half-written import artifacts.
if python3 "$SLICE_TOOLS" sql --ir "$SAMPLE" --slices "$TMP/slice-bad.json" --locale en \
  --service-id 11111111-1111-4111-8111-111111111111 > /dev/null 2>&1; then
  fail "slice-sql-guard: emitted SQL for an invalid slice file"
fi
pass "slice-sql-guard (invalid slice file produces no SQL)"

# Journey selection is arrow-derived: a lane with no triggers to the actor
# must not appear in any frame.
python3 - "$SAMPLE" "$SLICE_FILE" <<'PY' || fail "slice-journey-arrows: uncited companion cell in a frame"
import json, sys
ir = json.load(open(sys.argv[1], encoding="utf-8"))
doc = json.load(open(sys.argv[2], encoding="utf-8"))
entry = doc["slices"][0]
scenario = ir["service"]["phases"][0]["scenarios"][0]
path = next(p for p in scenario["paths"] if p["key"] == entry["path"])
linked = set()
for trigger in path.get("triggers", []):
    for end in ("source", "target"):
        linked.add((trigger[end]["lane"], trigger[end]["step"]))
for frame in entry["frames"]:
    for key in frame["cells"][1:]:
        lane, step = key.split("/")[4:6]
        if (lane, step) not in linked:
            print(f"uncited companion: {key}", file=sys.stderr)
            sys.exit(1)
PY
pass "slice-journey-arrows (companions come from recorded triggers only)"

# Step and lane selections stay inside their column / row.
python3 "$SLICE_TOOLS" select --ir "$SAMPLE" --scenario operate/asset-repair \
  --type step --step dispatch --key dispatch-moment > "$TMP/slice-step.json"
python3 "$SLICE_TOOLS" validate --ir "$SAMPLE" --slices "$TMP/slice-step.json" > /dev/null \
  || fail "slice-step: step selection did not validate"
python3 - "$TMP/slice-step.json" <<'PY' || fail "slice-step: frame contains a foreign step"
import json, sys
doc = json.load(open(sys.argv[1], encoding="utf-8"))
for frame in doc["slices"][0]["frames"]:
    for key in frame["cells"]:
        if key.split("/")[5] != "dispatch":
            sys.exit(1)
PY
python3 "$SLICE_TOOLS" select --ir "$SAMPLE" --scenario operate/asset-repair \
  --type lane --lane field-tech --key field-tech-lane > "$TMP/slice-lane.json"
python3 - "$TMP/slice-lane.json" <<'PY' || fail "slice-lane: frame contains a foreign lane"
import json, sys
doc = json.load(open(sys.argv[1], encoding="utf-8"))
for frame in doc["slices"][0]["frames"]:
    for key in frame["cells"]:
        if key.split("/")[4] != "field-tech":
            sys.exit(1)
PY
pass "slice-step/lane (selections stay inside their column and row)"

# Unknown scenario / missing required flag are errors, not empty output.
if python3 "$SLICE_TOOLS" select --ir "$SAMPLE" --scenario nope/nope --type lane \
  --lane citizen --key x > /dev/null 2>&1; then
  fail "slice-select-guard: expected non-zero exit for an unknown scenario"
fi
if python3 "$SLICE_TOOLS" select --ir "$SAMPLE" --scenario operate/asset-repair \
  --type lane --key x > /dev/null 2>&1; then
  fail "slice-select-guard: expected non-zero exit for a missing --lane"
fi
pass "slice-select-guard (unknown scenario and missing flag both error)"

# ---------------------------------------------------------------------------
# 7. Audit tools: fingerprint reason slug, intra-batch collision, ledger
#    backstop (audit-playbook §2/§3 reference implementation)
# ---------------------------------------------------------------------------

AUDIT_TOOLS="$REPO_ROOT/skills/audit/scripts/audit_tools.py"

# New fingerprint form: check ':' sha256(sorted cell_keys) ':' reason-slug —
# sorted, so cell order never changes identity.
FP="$(python3 "$AUDIT_TOOLS" fingerprint --check jargon-lint \
  --cell-keys b/cell a/cell --reason uco-acronym)" \
  || fail "audit-fingerprint-form: fingerprint failed"
DIGEST="$(printf 'a/cell\nb/cell' | python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())')"
[ "$FP" = "jargon-lint:$DIGEST:uco-acronym" ] \
  || fail "audit-fingerprint-form: expected 'jargon-lint:$DIGEST:uco-acronym', got '$FP'"
# A cell-bearing finding without a reason slug is an error, never an
# old-form (slugless) fingerprint.
if python3 "$AUDIT_TOOLS" fingerprint --check jargon-lint --cell-keys a/cell \
  > "$TMP/audit-noreason.out" 2>&1; then
  fail "audit-fingerprint-reason: expected non-zero exit without --reason"
fi
grep -q "reason slug" "$TMP/audit-noreason.out" \
  || fail "audit-fingerprint-reason: no reason-slug message"
# Zero-cell scope form is unchanged.
FP_SCOPE="$(python3 "$AUDIT_TOOLS" fingerprint --check gap-sweep \
  --scope sample-service:orphan-step)"
[ "$FP_SCOPE" = "gap-sweep:scope:sample-service:orphan-step" ] \
  || fail "audit-fingerprint-scope: got '$FP_SCOPE'"
pass "audit-fingerprint-form (reason slug in every fingerprint; slugless cell finding errors; scope form stable)"

# The live-observed collision: two findings from ONE check over the SAME
# cells. Distinct reason slugs -> two distinct fingerprints, two inserts.
cat > "$TMP/audit-incoming.json" <<'JSON'
[
 {"check_name": "jargon-lint", "severity": "warn", "note": "UCO acronym",
  "cell_keys": ["x/1", "x/2", "x/3"], "reason": "uco-acronym", "source": "audit"},
 {"check_name": "jargon-lint", "severity": "info", "note": "perms wording",
  "cell_keys": ["x/1", "x/2", "x/3"], "reason": "perms-wording", "source": "audit"}
]
JSON
rm -f "$TMP/audit-ledger.json"
python3 "$AUDIT_TOOLS" dedupe --ledger "$TMP/audit-ledger.json" \
  --incoming "$TMP/audit-incoming.json" > "$TMP/audit-dedupe.out" \
  || fail "audit-same-cells: dedupe failed on distinct-reason findings"
[ "$(grep -c '^insert' "$TMP/audit-dedupe.out")" -eq 2 ] \
  || fail "audit-same-cells: expected two inserts — $(cat "$TMP/audit-dedupe.out")"
python3 "$AUDIT_TOOLS" report --ledger "$TMP/audit-ledger.json" \
  --incoming "$TMP/audit-incoming.json" --run-id run-1 --apply > /dev/null \
  || fail "audit-same-cells: report --apply failed"
python3 - "$TMP/audit-ledger.json" <<'PY' || fail "audit-same-cells: ledger did not keep both rows open"
import json, sys
rows = json.load(open(sys.argv[1], encoding="utf-8"))["rows"]
assert len(rows) == 2, f"expected 2 rows, got {len(rows)}"
assert all(r["status"] == "open" for r in rows), "both rows must be open"
assert len({r["fingerprint"] for r in rows}) == 2, "fingerprints must differ"
PY
pass "audit-same-cells (same check + same cells, distinct reasons -> two open rows, no collapse)"

# A duplicate fingerprint WITHIN one incoming batch is a reported error,
# not a second insert — for dedupe AND report, which must leave the ledger
# untouched.
cat > "$TMP/audit-dup.json" <<'JSON'
[
 {"check_name": "jargon-lint", "severity": "warn", "note": "first",
  "cell_keys": ["x/1"], "reason": "same-slug", "source": "audit"},
 {"check_name": "jargon-lint", "severity": "info", "note": "second",
  "cell_keys": ["x/1"], "reason": "same-slug", "source": "audit"}
]
JSON
if python3 "$AUDIT_TOOLS" dedupe --ledger "$TMP/audit-ledger.json" \
  --incoming "$TMP/audit-dup.json" > "$TMP/audit-dup.out" 2>&1; then
  fail "audit-batch-collision: dedupe accepted an intra-batch duplicate"
fi
grep -q "duplicate fingerprint within the incoming batch" "$TMP/audit-dup.out" \
  || fail "audit-batch-collision: no intra-batch message — $(cat "$TMP/audit-dup.out")"
cp "$TMP/audit-ledger.json" "$TMP/audit-ledger.before.json"
if python3 "$AUDIT_TOOLS" report --ledger "$TMP/audit-ledger.json" \
  --incoming "$TMP/audit-dup.json" --run-id run-2 --apply > /dev/null 2>&1; then
  fail "audit-batch-collision: report --apply accepted an intra-batch duplicate"
fi
diff -q "$TMP/audit-ledger.json" "$TMP/audit-ledger.before.json" > /dev/null \
  || fail "audit-batch-collision: report wrote the ledger despite the error"
pass "audit-batch-collision (intra-batch duplicate fingerprint = reported error; ledger untouched)"

# File-ledger backstop mirroring the DB partial unique index: report
# --apply refuses to write two open rows with one fingerprint.
cat > "$TMP/audit-corrupt-ledger.json" <<'JSON'
{"rows": [
 {"check_name": "jargon-lint", "severity": "warn", "note": "a",
  "cell_keys": ["x/1"], "reason": "same-slug", "source": "audit",
  "fingerprint": "jargon-lint:deadbeef:same-slug", "status": "open", "run_id": "old-1"},
 {"check_name": "jargon-lint", "severity": "info", "note": "b",
  "cell_keys": ["x/1"], "reason": "same-slug", "source": "audit",
  "fingerprint": "jargon-lint:deadbeef:same-slug", "status": "open", "run_id": "old-2"}
]}
JSON
cp "$TMP/audit-corrupt-ledger.json" "$TMP/audit-corrupt-ledger.before.json"
printf '[]' > "$TMP/audit-empty.json"
if python3 "$AUDIT_TOOLS" report --ledger "$TMP/audit-corrupt-ledger.json" \
  --incoming "$TMP/audit-empty.json" --run-id run-3 --apply > "$TMP/audit-backstop.out" 2>&1; then
  fail "audit-ledger-backstop: expected refusal on duplicate open fingerprints"
fi
grep -q "duplicate open fingerprints" "$TMP/audit-backstop.out" \
  || fail "audit-ledger-backstop: no backstop message — $(cat "$TMP/audit-backstop.out")"
diff -q "$TMP/audit-corrupt-ledger.json" "$TMP/audit-corrupt-ledger.before.json" > /dev/null \
  || fail "audit-ledger-backstop: refused write still mutated the ledger"
pass "audit-ledger-backstop (two open rows with one fingerprint refuse to be written)"

# Migration: an old-form (slugless) open row stays a valid row and is left
# alone — dedupe compares exact strings, so new-form incoming inserts
# alongside it rather than colliding.
cat > "$TMP/audit-old-ledger.json" <<'JSON'
{"rows": [
 {"check_name": "jargon-lint", "severity": "warn", "note": "old form",
  "cell_keys": ["x/1", "x/2", "x/3"], "source": "audit",
  "fingerprint": "jargon-lint:0123456789abcdef", "status": "open", "run_id": "old-1"}
]}
JSON
python3 "$AUDIT_TOOLS" report --ledger "$TMP/audit-old-ledger.json" \
  --incoming "$TMP/audit-incoming.json" --run-id run-4 --apply > /dev/null \
  || fail "audit-migration: apply over an old-form ledger failed"
python3 - "$TMP/audit-old-ledger.json" <<'PY' || fail "audit-migration: old-form row lost or matched"
import json, sys
rows = json.load(open(sys.argv[1], encoding="utf-8"))["rows"]
assert len(rows) == 3, f"expected old row + 2 inserts, got {len(rows)}"
assert any(r["fingerprint"] == "jargon-lint:0123456789abcdef" for r in rows), "old-form row must survive"
PY
pass "audit-migration (old-form fingerprints stay valid rows; new writes use the new form)"

# export --scenario builds a filtered copy — the loaded IR must not lose
# scenarios (regression: the filter used to mutate the dict in place).
python3 - "$SAMPLE" "$REPO_ROOT" "$TMP" > /dev/null <<'PY' || fail "audit-export-copy: export filter mutated the loaded IR"
import argparse, copy, importlib.util, json, sys
sample, repo, tmp = sys.argv[1:4]
spec = importlib.util.spec_from_file_location(
    "audit_tools", f"{repo}/skills/audit/scripts/audit_tools.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# Hand cmd_export a shared, already-loaded dict: the scenario filter must
# work on a copy, leaving the caller's dict byte-identical.
shared = json.load(open(sample, encoding="utf-8"))
snapshot = copy.deepcopy(shared)
mod.load_ir = lambda path: shared
args = argparse.Namespace(ir=sample, scenario="asset-repair", out=f"{tmp}/audit-export.json")
assert mod.cmd_export(args) == 0, "scoped export failed"
assert shared == snapshot, "cmd_export --scenario mutated the loaded IR in place"
export = json.load(open(f"{tmp}/audit-export.json", encoding="utf-8"))
scoped = [s["key"] for p in export["service"]["phases"] for s in p["scenarios"]]
assert scoped == ["asset-repair"], f"scoped export wrong: {scoped}"
PY
pass "audit-export-copy (scenario filter copies; loaded IR and source stay intact)"

# --- adapter parity ---------------------------------------------------------
# The adapter contract calls the no-DB adapter "not a degraded mode". These two
# cases are the difference between that being a claim and being a fact: the
# sample IR must come out of both adapters carrying the same fields, AND the
# check must be able to fail — a parity check that cannot go red is a comment.

python3 "$REPO_ROOT/scripts/adapter_parity.py" "$SAMPLE" > /dev/null \
  || fail "adapter-parity: the two v1 adapters disagree on the sample IR"
pass "adapter-parity (SQL and no-DB adapters carry the same fields)"

python3 - "$SAMPLE" "$REPO_ROOT" <<'PY' || fail "adapter-parity: drift went undetected"
import pathlib, sys
sample, repo = sys.argv[1:3]
sys.path.insert(0, f"{repo}/scripts")
import adapter_parity, generate_seed_sql

# Teach the SQL adapter a column the no-DB adapter never learns — exactly the
# drift that lost cell_key and the cell spec fields — and require a complaint.
original = generate_seed_sql.seed_cell_fields
def wider(cell, path):
    row = original(cell, path)
    row["status"] = "draft"
    return row
generate_seed_sql.seed_cell_fields = adapter_parity.seed_cell_fields = wider

problems = adapter_parity.check(pathlib.Path(sample), None)
assert problems, "a field on one adapter and not the other must be reported"
assert any("status" in line for line in problems), f"wrong complaint: {problems[:1]}"
PY
pass "adapter-parity-negative (a field on one adapter only is reported)"

python3 - "$SAMPLE" "$REPO_ROOT" <<'PY' || fail "adapter-parity: a lane-only field went undetected"
import pathlib, sys
sample, repo = sys.argv[1:3]
sys.path.insert(0, f"{repo}/scripts")
import adapter_parity, generate_fallbacks

# The state this check shipped in, before review caught it: lanes projected by
# hand, without kpis/tools, while the SQL adapter wrote both. The harness
# compared cells and edges only and reported agreement.
original = generate_fallbacks.blueprint_data_for_path
def without_lane_spec(scenario, path):
    data = original(scenario, path)
    data["lanes"] = [
        {k: v for k, v in lane.items() if k not in ("kpis", "tools")}
        for lane in data["lanes"]
    ]
    return data
generate_fallbacks.blueprint_data_for_path = without_lane_spec
adapter_parity.blueprint_data_for_path = without_lane_spec

problems = adapter_parity.check(pathlib.Path(sample), None)
assert problems, "a lane field on one adapter only must be reported"
assert any("kpis" in line for line in problems), f"wrong complaint: {problems[:1]}"
assert any(line.startswith(f"{sample} [en]: lane ") for line in problems), \
    "the complaint must name the aggregate that drifted"
PY
pass "adapter-parity-lanes (a lane field on one adapter only is reported)"

# ---------------------------------------------------------------------------
# 8. Schema-version migration: an old IR is refused by name and carried
#    forward, and sign-off survives the bump (#61)
# ---------------------------------------------------------------------------

# The version enum still lists 2026.07.16, so "is it in the enum" cannot be the
# whole check: an IR at a superseded version has the OLD field names, and
# validating its body would report every renamed field as an unknown key. One
# error, naming the command that fixes it.
if python3 "$VALIDATE" "$SAMPLE_OLD" > "$TMP/old-version.out" 2>&1; then
  fail "migrate-refusal: expected non-zero exit on a superseded schema_version"
fi
grep -q "migrate_ir.py" "$TMP/old-version.out" \
  || fail "migrate-refusal: message must name the upgrade command — got: $(cat "$TMP/old-version.out")"
[ "$(grep -c '^ERROR' "$TMP/old-version.out")" = 1 ] \
  || fail "migrate-refusal: renamed fields leaked into the report — $(cat "$TMP/old-version.out")"
pass "migrate-refusal (superseded version: one error, naming the upgrade)"

# Migrating the pre-bump fixture must land exactly on the current fixture —
# the two files are the same blueprint on either side of the rename.
cp "$SAMPLE_OLD" "$TMP/migrate-me.json"
python3 "$MIGRATE" "$TMP/migrate-me.json" --write > "$TMP/migrate.out" 2>&1 \
  || fail "migrate-forward: migration failed — $(cat "$TMP/migrate.out")"
python3 "$VALIDATE" "$TMP/migrate-me.json" > "$TMP/migrated-valid.out" 2>&1 \
  || fail "migrate-forward: migrated IR does not validate — $(cat "$TMP/migrated-valid.out")"
python3 - "$TMP/migrate-me.json" "$SAMPLE" <<'PYMIG'
import json, sys
migrated = json.load(open(sys.argv[1], encoding="utf-8"))
current = json.load(open(sys.argv[2], encoding="utf-8"))
assert migrated == current, "migrated IR differs from the current-version fixture"
# A link's `description` is prose about the link and keeps its name; a
# text-level rename would have taken it with the rest.
link = current["service"]["phases"][0]["scenarios"][0]["paths"][0]["cells"][0]["links"][0]
assert "summary" not in link, "the migration renamed a link's description"
PYMIG
pass "migrate-forward (pre-bump fixture migrates to the current fixture, and validates)"

# The load-bearing one: sign-off binds to a hash of a scenario subtree, and the
# bump renames fields INSIDE that subtree — so every recorded hash would be
# wrong afterwards. --workspace moves each signed scenario's hash onto its
# migrated subtree, keeping signed_at/signed_by.
cp "$SAMPLE_OLD" "$TMP/signed-ir.json"
python3 - "$REPO_ROOT" "$TMP" <<'PYSIGN'
import json, pathlib, sys
repo, tmp = sys.argv[1], sys.argv[2]
sys.path.insert(0, str(pathlib.Path(repo) / "scripts"))
import migrate_ir

doc = json.load(open(f"{tmp}/signed-ir.json", encoding="utf-8"))
hashes = migrate_ir.scenario_hashes(doc)
assert hashes, "fixture has no scenarios to sign"
scenarios = {
    key: {
        "status": "signed_off",
        "content_hash": digest,
        "signed_at": "2026-07-16T11:03:00Z",
        "signed_by": "bill",
    }
    for key, digest in hashes.items()
}
json.dump(
    {
        "schema_version": "2026.07.16",
        "ir_path": "signed-ir.json",
        "locales": doc["locales"],
        "scenarios": scenarios,
    },
    open(f"{tmp}/signed-workspace.json", "w", encoding="utf-8"),
    ensure_ascii=False,
    indent=2,
)
PYSIGN
python3 "$MIGRATE" "$TMP/signed-ir.json" --workspace "$TMP/signed-workspace.json" --write \
  > "$TMP/migrate-signoff.out" 2>&1 \
  || fail "migrate-signoff: migration failed — $(cat "$TMP/migrate-signoff.out")"
grep -q "re-anchored" "$TMP/migrate-signoff.out" \
  || fail "migrate-signoff: no re-anchor reported — $(cat "$TMP/migrate-signoff.out")"
python3 - "$REPO_ROOT" "$TMP" <<'PYVERIFY'
import json, subprocess, sys
repo, tmp = sys.argv[1], sys.argv[2]
workspace = json.load(open(f"{tmp}/signed-workspace.json", encoding="utf-8"))
assert workspace["schema_version"] == "2026.08.25", "workspace version not bumped"

out = subprocess.run(
    [sys.executable, f"{repo}/scripts/compute_signoff_hash.py",
     f"{tmp}/signed-ir.json", "--json"],
    capture_output=True, text=True, check=True,
)
live = json.loads(out.stdout)
assert live, "migrated IR yielded no scenario hashes"
for key, digest in live.items():
    entry = workspace["scenarios"][key]
    assert entry["content_hash"] == digest, (
        f"{key}: recorded {entry['content_hash']}, IR now hashes to {digest}"
    )
    assert entry["status"] == "signed_off", f"{key}: sign-off dropped"
    assert entry["signed_by"] == "bill", f"{key}: signer lost"
PYVERIFY
pass "migrate-signoff (signed scenarios re-verify after migration)"

# A scenario hand-edited after sign-off carries a hash that matches neither
# side of the bump. It was de-signed before the migration ran, so re-anchoring
# it would launder an unreviewed edit into a signed one: report and leave it.
cp "$SAMPLE_OLD" "$TMP/stale-ir.json"
python3 - "$TMP" <<'PYSTALE'
import json, sys
tmp = sys.argv[1]
json.dump(
    {
        "schema_version": "2026.07.16",
        "ir_path": "stale-ir.json",
        "locales": ["en", "zh"],
        "scenarios": {
            "asset-repair": {
                "status": "signed_off",
                "content_hash": "sha256:" + "0" * 64,
                "signed_at": "2026-07-16T11:03:00Z",
                "signed_by": "bill",
            }
        },
    },
    open(f"{tmp}/stale-workspace.json", "w", encoding="utf-8"),
    ensure_ascii=False,
    indent=2,
)
PYSTALE
python3 "$MIGRATE" "$TMP/stale-ir.json" --workspace "$TMP/stale-workspace.json" --write \
  > "$TMP/migrate-stale.out" 2>&1 \
  || fail "migrate-stale: migration failed — $(cat "$TMP/migrate-stale.out")"
grep -q "already stale before this migration" "$TMP/migrate-stale.out" \
  || fail "migrate-stale: a stale hash must be reported — $(cat "$TMP/migrate-stale.out")"
grep -q '"sha256:0000000000000000000000000000000000000000000000000000000000000000"' \
  "$TMP/stale-workspace.json" \
  || fail "migrate-stale: a hash that was already stale must not be re-anchored"
pass "migrate-stale (a hash stale before the bump is reported, not laundered)"

# A version with no step is a dead end, and says so instead of half-migrating.
python3 - "$SAMPLE" "$TMP" <<'PYNOPATH'
import json, sys
doc = json.load(open(sys.argv[1], encoding="utf-8"))
doc["schema_version"] = "1999.01.01"
json.dump(doc, open(f"{sys.argv[2]}/no-path.json", "w", encoding="utf-8"), ensure_ascii=False)
PYNOPATH
if python3 "$MIGRATE" "$TMP/no-path.json" > "$TMP/no-path.out" 2>&1; then
  fail "migrate-no-path: expected non-zero exit for a version with no step"
fi
grep -q "no migration carries" "$TMP/no-path.out" \
  || fail "migrate-no-path: unhelpful message — $(cat "$TMP/no-path.out")"
python3 "$MIGRATE" "$SAMPLE" > "$TMP/no-op.out" 2>&1 \
  || fail "migrate-no-op: a current IR must exit 0"
grep -q "already at" "$TMP/no-op.out" || fail "migrate-no-op: no 'already at' line"
pass "migrate-edges (no step: named dead end; current IR: no-op)"

echo
echo "All $PASS_COUNT tests passed."
