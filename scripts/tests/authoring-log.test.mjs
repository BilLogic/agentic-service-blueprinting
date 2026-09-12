#!/usr/bin/env node
/**
 * The one seam between the log's two writers, held from both sides.
 *
 * `public.authoring_changes` has two writers, and it has to. The client
 * appends every ordinary write through `record_authoring_change`; the delete
 * functions append their own row, because a deleted row's payload can only be
 * captured inside the transaction that destroys it.
 *
 * That leaves exactly one way for the two halves to disagree, and it is
 * silent in both directions:
 *
 *   - a delete function the client does NOT skip records twice, once with the
 *     payload and once without, and the second row looks exactly like a
 *     record of the same event while being unable to restore anything
 *   - a delete function the client skips that does NOT archive records
 *     nothing at all, which is the defect the one log exists to end
 *
 * `ARCHIVED_BY_THE_DATABASE` is one half. The set read out of the migrations
 * is the other. Neither derives from the other — same shape and same argument
 * as the rename map's two lists — so this test is what makes them one fact.
 *
 * The fixtures below are the part worth reading: the check is green against
 * the repository, which means the green run is not evidence it looks at
 * anything. Each red case is a shape the scanner has to report, written out so
 * that a scanner that stopped examining its subject fails here first.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  archivingFunctions,
  archivingFunctionsIn,
} from '../authoring-archivers.mjs'
// Through the alias, not up two directories. The client half of this seam is
// APPLICATION source, and a deployment that reads the application out of the
// package has no `src` to walk up into — `../../src/lib/…` is a file that is
// not there, and the suite cannot even load. `@/…` is the same two roots the
// build resolves, so this import lands on whichever one holds the application.
import { ARCHIVED_BY_THE_DATABASE } from '@/lib/authoringLog.ts'

/**
 * The SQL half is the READING repository's own, and stays a plain path.
 *
 * The application is shared and the migration series is not: two repositories
 * running this application apply their own migrations, so the question this
 * test asks — does the client skip exactly what THIS database archives — is
 * asked of the local series against the mounted client.
 */
const MIGRATIONS = resolve(
  new URL('../..', import.meta.url).pathname,
  'supabase/migrations',
)

/** One archiving function, in the shape all six actually have. */
const archiver = (name, kind) => `
create or replace function public.${name}(target uuid)
returns uuid
language plpgsql security definer
as $$
declare archive_id uuid; payload jsonb;
begin
  insert into public.deleted_structure (kind, label, payload, affected_slices)
  values ('${kind}', 'a label', payload, '[]'::jsonb)
  returning id into archive_id;
  return archive_id;
end;
$$;
`

test('the client skips exactly the SQL functions that archive', () => {
  const archivers = archivingFunctionsIn(MIGRATIONS)
  // Both halves are asserted present before they are compared, because the
  // one thing this assertion cannot notice on its own is having nothing to
  // compare: an empty skip set and an empty sweep agree perfectly, and the
  // agreement is what a reader takes away from the green line.
  assert.ok(
    ARCHIVED_BY_THE_DATABASE.size > 0,
    'the client skips no function at all, so this comparison holds nothing',
  )
  assert.ok(
    archivers.length > 0,
    `no archiving function in ${MIGRATIONS}, so this comparison holds nothing`,
  )
  assert.deepEqual([...ARCHIVED_BY_THE_DATABASE].sort(), archivers)
})

test('a migration directory with nothing in it is a failure, not an empty set', () => {
  // The shape the assertion above cannot see from the inside: a sweep that
  // read the wrong directory reports no archivers, and no archivers matches a
  // client that skips nothing.
  const empty = mkdtempSync(join(tmpdir(), 'migrations-'))
  try {
    assert.throws(() => archivingFunctionsIn(empty), /no \.sql files/)
  } finally {
    rmSync(empty, { recursive: true, force: true })
  }
})

test('a seventh archiving function is reported, not absorbed', () => {
  // The red case for the double-record direction. A new delete RPC written the
  // way the six are written appears here, and the assertion above then fails
  // until someone adds the line to the client that stops it recording twice.
  const found = archivingFunctions(archiver('delete_touchpoint', 'cell'))
  assert.deepEqual(found, ['delete_touchpoint'])
})

test('a function that inserts without a payload is not an archiver', () => {
  // `record_authoring_change` is this shape, and it is the client's own append
  // seam — sweeping it in would demand the client skip the thing that does the
  // appending, which records nothing at all. Keyed on the payload column and
  // not on the relation, for exactly this row.
  const found = archivingFunctions(`
create or replace function public.record_authoring_change(fn text)
returns uuid
language plpgsql security definer
as $$
declare change_id uuid;
begin
  insert into public.authoring_changes (fn, args, revert, author, agent_session_id)
  values (fn, '{}'::jsonb, null, 'human', null)
  returning id into change_id;
  return change_id;
end;
$$;
`)
  assert.deepEqual(found, [])
})

test('the insert is attributed to the function it is inside, not the last one seen', () => {
  const found = archivingFunctions(
    archiver('delete_cell', 'cell') + archiver('delete_path', 'path'),
  )
  assert.deepEqual(found, ['delete_cell', 'delete_path'])
})

test('an archiving insert quoted in a comment names nobody', () => {
  // The folding migration quotes the before-and-after of its redirect in a
  // `--` comment, after the last function it defines. Read literally, that
  // comment makes `record_authoring_change` look like an archiver.
  const found = archivingFunctions(`
create or replace function public.record_authoring_change(fn text)
returns uuid language sql as $$ select gen_random_uuid() $$;

-- insert into public.deleted_structure (kind, label, payload, affected_slices)
-- values ('cell', 'a label', payload, '[]'::jsonb)
`)
  assert.deepEqual(found, [])
})

test('an archiving insert inside a do block names nobody', () => {
  // The same migration carries the rewritten insert as the REPLACEMENT STRING
  // of the sweep that installs it. It is a string in a `do` block, not a
  // function body, and it too sits after the last definition in the file.
  const found = archivingFunctions(`
create or replace function public.record_authoring_change(fn text)
returns uuid language sql as $$ select gen_random_uuid() $$;

do $sweep$
begin
  execute replace(d,
    'insert into public.deleted_structure (kind, label, payload, affected_slices)',
    'insert into public.authoring_changes (fn, deleted_kind, label, payload, affected_slices)');
end
$sweep$;
`)
  assert.deepEqual(found, [])
})

test('a file that defines no function reports nothing rather than throwing', () => {
  assert.deepEqual(archivingFunctions('select 1;'), [])
})
