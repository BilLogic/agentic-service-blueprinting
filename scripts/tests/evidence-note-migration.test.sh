#!/usr/bin/env bash

# A non-empty replay for 21000208000000. The normal CI replay starts empty, so
# it proves the migration parses and drops two columns — but every claim worth
# making here is about ROWS: that an excerpt reaches the note, and that a
# reference or a conflicting pair stops the migration instead of being
# destroyed. An empty database cannot tell those two apart from a no-op.

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATABASE_NAME="${1:-evidence_note_migration_test}"
TARGET="21000208000000_a_source_carries_one_note.sql"
CREATED=0
RERUN="bash scripts/tests/evidence-note-migration.test.sh"

cleanup() {
  if [ "$CREATED" = 1 ]; then
    dropdb "$DATABASE_NAME"
  fi
}
trap cleanup EXIT

on_error() {
  local status=$?
  local source="${BASH_SOURCE[1]#"$REPO_ROOT"/}"
  local line="${BASH_LINENO[0]}"
  trap - ERR
  echo "$source:$line: migration replay command failed (exit $status)" >&2
  echo "Run: $RERUN" >&2
  exit "$status"
}
trap on_error ERR

fail() {
  echo "supabase/migrations/$TARGET: $1" >&2
  echo "Run: $RERUN" >&2
  exit 1
}

createdb "$DATABASE_NAME"
CREATED=1
psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" \
  -f "$REPO_ROOT/supabase/portable/supabase-shim.sql" >/dev/null

for file in "$REPO_ROOT"/supabase/migrations/*.sql; do
  if [ "$(basename "$file")" = "$TARGET" ]; then
    break
  fi
  psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -f "$file" >/dev/null
done

# Every row below is a shape the deployment actually holds, at the schema as it
# stood BEFORE the target: `ref` and `excerpt` are still columns here, so a
# vocabulary sweep that "fixes" these two names makes the seed insert into
# columns that no longer exist and the test stops testing anything.
seed() {
  psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" >/dev/null <<SQL
set client_min_messages to warning;
truncate public.evidence, public.services cascade;
insert into public.services (id, name)
values ('20000000-0000-4000-8000-000000000001', 'Migration proof');
insert into public.evidence
  (service_id, proposition_question_key, kind, title, ref, excerpt, note)
values $1;
SQL
}

# `-1`, because that is how the file is applied for real: `supabase db push`
# runs one migration in one transaction, which is the whole reason a guard that
# raises is worth writing. Without it the fold would commit and only the drop
# would roll back, and the assertion below that the columns survive a refusal
# would be testing psql rather than the migration.
apply_target() {
  psql -1 -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" \
    -f "$REPO_ROOT/supabase/migrations/$TARGET" 2>&1
}

# ---- 1. A reference stops the migration ------------------------------------
#
# Measured in production: zero of 66 rows carried one, which is why the column
# goes. A deployment that has since acquired one must not lose it silently.

seed "('20000000-0000-4000-8000-000000000001', 'value', 'doc',
       'PR 1151', 'https://example.com/pr/1151', null, null)"

if apply_target >/tmp/evidence-note-ref.log 2>&1; then
  fail "a row carrying a reference did not stop the migration"
fi
if ! grep -q 'carry a reference' /tmp/evidence-note-ref.log; then
  fail "the reference guard raised, but not with the sentence that says what to do"
fi
if [ "$(psql -At -d "$DATABASE_NAME" -c \
    "select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'evidence'
        and column_name in ('ref', 'excerpt')")" != "2" ]; then
  fail "the guard raised and the columns went anyway"
fi

# ---- 2. An excerpt beside a different note stops it too ---------------------

seed "('20000000-0000-4000-8000-000000000001', 'value', 'interview',
       'Onboarding 4', null, 'Their words, verbatim', 'A different sentence')"

if apply_target >/tmp/evidence-note-both.log 2>&1; then
  fail "a row carrying both an excerpt and a different note did not stop the migration"
fi
if ! grep -q 'both an excerpt and a different note' /tmp/evidence-note-both.log; then
  fail "the excerpt guard raised, but not with the sentence that says what to do"
fi

# ---- 3. Otherwise the prose survives and both columns go -------------------

seed "('20000000-0000-4000-8000-000000000001', 'value', 'interview',
       'Excerpt only', null, 'Their words, verbatim', null),
      ('20000000-0000-4000-8000-000000000001', 'value', 'meeting',
       'Note only', null, null, 'Help is available on demand'),
      ('20000000-0000-4000-8000-000000000001', 'value', 'doc',
       'Same in both', '', 'One sentence', 'One sentence')"

apply_target >/dev/null

ACTUAL="$(psql -At -F '|' -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -c \
  "select title, coalesce(note, '') from public.evidence order by title")"
EXPECTED='Excerpt only|Their words, verbatim
Note only|Help is available on demand
Same in both|One sentence'

if [ "$ACTUAL" != "$EXPECTED" ]; then
  fail "the prose did not survive the fold; got:
$ACTUAL"
fi

if [ "$(psql -At -d "$DATABASE_NAME" -c \
    "select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'evidence'
        and column_name in ('ref', 'excerpt')")" != "0" ]; then
  fail "the migration ran and the columns are still there"
fi

echo "PASS: an excerpt reaches the note, and a reference stops the migration"
