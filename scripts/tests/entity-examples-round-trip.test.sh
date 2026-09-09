#!/usr/bin/env bash

# A ROUND TRIP for `services.entity_examples`, which is why it needs a database
# and cannot be a unit test of the emitter.
#
# The column is writable from the editor and was invisible to the authoring
# pipeline: the IR did not model it and the seed generator did not emit it, so
# an authored example was dropped on the way to the seed and a re-map wrote
# nothing where the deployment had something. A test that only reads the
# generated SQL proves the emitter changed. It cannot prove the thing that was
# actually broken — that an example AUTHORED IN THE SOURCE arrives, and that
# the next re-map does not take it away again. Only a load can say that, so
# this replays the schema, loads a generated seed, and reads the row back.
#
# Four claims, in the order a deployment meets them:
#
#   1. authored -> seeded. An example in the service block is in the row.
#   2. re-map -> unchanged. Loading the same seed again leaves it alone.
#   3. the source is SILENT -> the target keeps what it has. This is the
#      judgement call the conflict clause makes, and the half that would fail
#      silently if it were ever reverted: a deployment that authored examples
#      from the editor re-maps a service block that mentions none, and keeps
#      them. `{}` is what "nobody wrote any" and "someone deleted them all"
#      both generate, so it has to read as silence.
#   4. the source SPEAKS -> it is the whole truth. A map that IS present
#      clears the kinds it omits, so the generator can still remove one.
#
# Requires a local PostgreSQL server and permission to create a database — the
# same stance as scripts/tests/resource-split-migration.test.sh, which this is
# modelled on. No Docker, no Supabase.

set -Eeuo pipefail

# The replay is long and every `if exists` guard raises a NOTICE. Only warnings
# and errors are worth reading here.
export PGOPTIONS="${PGOPTIONS:---client-min-messages=warning}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATABASE_NAME="${1:-entity_examples_round_trip}"
IR="$REPO_ROOT/scripts/tests/sample-ir.json"
SEED_GEN="$REPO_ROOT/scripts/generate_seed_sql.py"
RERUN="bash scripts/tests/entity-examples-round-trip.test.sh"
TMP="$(mktemp -d)"
CREATED=0

cleanup() {
  if [ "$CREATED" = 1 ]; then
    dropdb "$DATABASE_NAME"
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

on_error() {
  local status=$?
  local source="${BASH_SOURCE[1]#"$REPO_ROOT"/}"
  local line="${BASH_LINENO[0]}"
  trap - ERR
  echo "$source:$line: round-trip command failed (exit $status)" >&2
  echo "Run: $RERUN" >&2
  exit "$status"
}
trap on_error ERR

# The example the fixture authors under `phase`, read out of the IR rather than
# copied here — a fixture edit that changed the wording would otherwise make
# this pass against a string nobody seeds.
AUTHORED="$(python3 -c '
import json, sys
doc = json.load(open(sys.argv[1], encoding="utf-8"))
sys.stdout.write(doc["service"]["entity_examples"]["phase"]["en"])
' "$IR")"

# The same source with the whole map taken out: the service block that says
# nothing about examples. Generated from the fixture so the two seeds differ in
# exactly one thing.
python3 - "$IR" "$TMP/silent-ir.json" <<'PY'
import json, sys
source, destination = sys.argv[1:3]
doc = json.load(open(source, encoding="utf-8"))
doc["service"].pop("entity_examples")
json.dump(doc, open(destination, "w", encoding="utf-8"), ensure_ascii=False)
PY

python3 "$SEED_GEN" "$IR" --locale en --out "$TMP/authored.sql" >/dev/null
python3 "$SEED_GEN" "$TMP/silent-ir.json" --locale en --out "$TMP/silent.sql" >/dev/null

createdb "$DATABASE_NAME"
CREATED=1
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" \
  -f "$REPO_ROOT/supabase/portable/supabase-shim.sql" >/dev/null
for file in "$REPO_ROOT"/supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -f "$file" >/dev/null
done

examples() {
  psql -At -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -c \
    "select coalesce(entity_examples ->> '$1', '') from public.services"
}

expect() {
  local claim="$1" kind="$2" want="$3" got
  got="$(examples "$kind")"
  if [ "$got" != "$want" ]; then
    echo "scripts/generate_seed_sql.py: $claim" >&2
    echo "  entity_examples -> '$kind'" >&2
    echo "  expected: ${want:-(absent)}" >&2
    echo "  actual:   ${got:-(absent)}" >&2
    echo "Run: $RERUN" >&2
    exit 1
  fi
}

# 1. An example authored in the source reaches the row.
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -f "$TMP/authored.sql" >/dev/null
expect "an authored example never reached the seed" phase "$AUTHORED"

# 2. The re-map leaves it alone.
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -f "$TMP/authored.sql" >/dev/null
expect "a re-map of the same source changed the example" phase "$AUTHORED"

# 3. The deployment authors a kind of its own from the editor, and re-maps a
#    source that says nothing about examples. Both survive.
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" >/dev/null <<'SQL'
update public.services
   set entity_examples = entity_examples
     || '{"lane": "Night crew — the row for whoever is out after dark."}'::jsonb;
SQL
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -f "$TMP/silent.sql" >/dev/null
expect "a source with no examples erased the deployment's own" \
  lane "Night crew — the row for whoever is out after dark."
expect "a source with no examples erased a seeded example" phase "$AUTHORED"

# 4. A source that DOES author examples is the whole truth: the fixture's map
#    has no `lane`, so the re-map clears it and keeps the kinds it names.
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -f "$TMP/authored.sql" >/dev/null
expect "a source that authors examples did not clear the kind it omits" lane ""
expect "a source that authors examples dropped the kind it names" phase "$AUTHORED"

echo "PASS: an authored example survives a re-map, and silence does not clear one"
