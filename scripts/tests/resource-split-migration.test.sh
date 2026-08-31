#!/usr/bin/env bash

# A non-empty replay for 21000113000000. The normal CI replay starts empty,
# which proves the migration parses but cannot prove that authored values move.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATABASE_NAME="${1:-resource_split_migration_test}"
TARGET="21000113000000_one_column_held_two_unrelated_things.sql"
CREATED=0

cleanup() {
  if [ "$CREATED" = 1 ]; then
    dropdb "$DATABASE_NAME"
  fi
}
trap cleanup EXIT

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

psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" >/dev/null <<'SQL'
insert into public.services (id, name, summary)
values ('10000000-0000-4000-8000-000000000001', 'Migration proof', null);

insert into public.phases (id, service_id, name, summary, position)
values (
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'Before', null, 1
);

insert into public.scenarios (id, phase_id, name, summary, position, view_type)
values (
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000002',
  'Carry the citation', null, 1, 'single'
);

insert into public.paths (id, scenario_id, name, summary, note, path_type)
values (
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000003',
  'As recorded', null, null, 'happy'
);

insert into public.steps (id, scenario_id, name)
values (
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000003',
  'Observe'
);

insert into public.path_steps (path_id, step_id, position)
values (
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  1
);

insert into public.lanes (id, path_id, name, lane_role, position)
values (
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000004',
  'Observer', 'customer_actions', 1
);

insert into public.cells (
  id, path_id, lane_id, step_id, position, content, links, value_props, cell_key
)
values (
  '10000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000005',
  0,
  'Read the source',
  '[{"type":"ref","label":"Interview transcript","url":"https://evidence.example/interview/42"}]'::jsonb,
  '[]'::jsonb,
  'migration-proof/before/carry-the-citation/as-recorded/observer/observe'
);
SQL

psql -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" \
  -f "$REPO_ROOT/supabase/migrations/$TARGET" >/dev/null

ACTUAL_REF="$(psql -At -v ON_ERROR_STOP=1 -d "$DATABASE_NAME" -c \
  "select ref from public.evidence where added_by = 'cells-links-split'")"

if [ "$ACTUAL_REF" != "https://evidence.example/interview/42" ]; then
  echo "supabase/migrations/$TARGET:358: citation target did not reach evidence.ref; got '$ACTUAL_REF'" >&2
  echo "Run: bash scripts/tests/resource-split-migration.test.sh" >&2
  exit 1
fi

echo "PASS: citation target reaches evidence.ref"
