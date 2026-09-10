import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

/**
 * The undo path takes its input off the in-memory stack, and from nowhere else.
 *
 * `public.authoring_changes` holds a `revert` on most of its rows, and those
 * rows are not one shape. Measured on production, 24 of 63 rows carry an
 * inverse; 23 of them match what this build records for their operation, and
 * one does not. The `update_cell_content` row written 2026-09-02 06:31 UTC
 * carries `args {cell_id, content}` and `revert.args {cell_id, content,
 * removed_placements}`, where this build records `args {cell_id}` and
 * `revert.args {cell_id, update, removed_placements}` with `update` a nested
 * `CellContentUpdate`. There is no version on a stored record and no
 * discriminator, and `revertChange.ts` reads every captured payload through an
 * unchecked cast.
 *
 * **That row is not an older version of this app's output.** Worth being
 * precise, because it changes which remedy works. `cellContentMutations.ts`
 * has recorded the nested `update` since 2026-08-04 and no commit in either
 * repository has ever recorded a flat `content`; `removed_placements` did not
 * exist before 2026-08-30, so the row combines a field younger than the
 * divergence with a shape the code has never emitted. It was written by
 * something calling `public.record_authoring_change` directly, in the middle
 * of a sub-second scripted batch. That function gates on
 * `is_service_account()` and checks that `fn` is a non-empty string; about
 * `args` and `revert` it asserts nothing at all. They are free jsonb.
 *
 * So the heterogeneity here is an unvalidated write surface rather than
 * version drift, and that is the argument against versioning the record. A
 * version column only means something when every writer stamps it, and this
 * table's writers are "whatever holds EXECUTE on that function" — the one
 * divergent row was put there by something that was not this app, and would
 * have carried no version to read. Refusing to take input from the table
 * covers a writer the record cannot describe. Versioning does not.
 *
 * That was harmless, and the reason it was harmless is worth stating exactly:
 * nothing replays those rows. Undo reads the module-level array in
 * `authoringSession.ts`, which cannot outlive a page load, so every inverse
 * ever executed was built by the build executing it. The casts are sound
 * because their input never crosses a version boundary.
 *
 * **It was a habit, not a guard.** Nothing in the code, the schema or the
 * tests would have failed if someone had wired a read of the log into
 * `executeRevert`. It would have type-checked — the casts see to that — and
 * then thrown at run time on the older rows, or worse, half-applied on a shape
 * that happened to overlap. And something plausibly reaches for it:
 * `public.trash` is already a view over the deletion rows of that same table,
 * so the log is less unread than its comment claimed, and the permanent record
 * is the obvious thing to grab when the session array has been emptied.
 *
 * The decision was to enforce the boundary rather than version the record —
 * versioning buys a replay nobody has asked for, would leave the casts
 * standing behind a field that had never been exercised, and, per the row
 * above, could not describe the writer that actually produced the divergence.
 * What was missing was the wall the comment described. This file is that wall,
 * in the same spirit
 * as `writeBoundaryContract.test.ts` beside it: a rule about WHERE INPUT MAY
 * COME FROM, not a list of the callers that exist today. A new caller reaching
 * for the table tomorrow is the case it exists to catch, and a census of
 * today's call sites would pass while that happened.
 *
 * Three things hold it up, and they fail independently:
 *
 *   1. `executeRevert` names `SessionEntry` in its signature. Widen it back to
 *      `ChangeEntry`, `unknown` or `any` and the type stops refusing anything.
 *   2. Only the session module mints a `SessionEntry`. The brand is phantom,
 *      so the one way to forge it is a cast, and a cast is greppable.
 *   3. The session stack cannot be hydrated. If `authoringSession.ts` could
 *      reach a database, rows could enter the array through the front door and
 *      wear the brand legitimately — which is the one hole the type alone
 *      cannot see.
 */
const SRC = resolve(__dirname, '..')

/** `src`-relative paths this file reasons about, read eagerly so a rename fails loudly. */
const SESSION = 'lib/authoringSession.ts'
const APPLIER = 'lib/revertChange.ts'
const LOG = 'lib/authoringLog.ts'

/**
 * This file, which quotes the forbidden shape in order to prove the pattern
 * recognises it. The exemption is one path and it is a test, so nothing it
 * writes can reach the app's stack; the alternative is spelling the sample
 * strings in pieces, which would hide the very shape the reader came here to
 * see.
 */
const SELF = 'lib/revertBoundaryContract.test.ts'

const read = (relative: string): string =>
  readFileSync(resolve(SRC, relative), 'utf8')

test('every module this contract reasons about still exists', () => {
  const missing = [SESSION, APPLIER, LOG, SELF].filter(
    (relative) => !existsSync(resolve(SRC, relative)),
  )
  expect(
    missing,
    `The revert boundary is stated in terms of files that are no longer there: ` +
      `${missing.join(', ')}. If one moved, move this contract with it — the ` +
      `alternative is a test that passes because it is looking at nothing.`,
  ).toEqual([])
})

/**
 * `executeRevert(client, entry: SessionEntry)`.
 *
 * Matched loosely across the parameter list so reformatting cannot break it,
 * and anchored on the parameter NAME as well as the type so a second
 * `SessionEntry` somewhere else in the signature could not satisfy it.
 */
const SIGNATURE = /export async function executeRevert\([^)]*\bentry:\s*SessionEntry\b/

test('executeRevert accepts a session entry and nothing else', () => {
  expect(
    SIGNATURE.test(read(APPLIER)),
    `executeRevert no longer declares its input as a SessionEntry.\n\n` +
      `That parameter is the whole boundary. SessionEntry is minted only by ` +
      `recordChange, so declaring it is what makes "this inverse was built by ` +
      `the build applying it" a fact the compiler checks. Widened to ` +
      `ChangeEntry (or unknown, or any), a row read out of ` +
      `public.authoring_changes type-checks straight into the ten casts below ` +
      `it — and the stored payloads are not all the shape those casts name.`,
  ).toBe(true)
})

/**
 * A cast that forges the brand. `as SessionEntry`, with or without the
 * `unknown` hop, and with or without a trailing `[]`.
 *
 * There is no need to look for annotations or `satisfies`: the brand is a
 * phantom property, so `const entry: SessionEntry = row` and `row satisfies
 * SessionEntry` are both compile errors already. An assertion is the only way
 * through, which is what makes a text scan sufficient here rather than a
 * stand-in for a type check.
 */
const MINT = /\bas\s+(?:unknown\s+as\s+)?SessionEntry\b/g

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (/\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

test('only the session stack mints a session entry', () => {
  const offenders: string[] = []
  for (const file of walk(SRC)) {
    const relative = file.slice(SRC.length + 1)
    if (relative === SESSION || relative === SELF) continue
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(MINT)) {
      const line = source.slice(0, match.index).split('\n').length
      offenders.push(`${relative}:${line} — ${match[0]}`)
    }
  }

  expect(
    offenders,
    `A session entry was minted outside ${SESSION}:\n  ${offenders.join('\n  ')}\n\n` +
      `Only recordChange may brand an entry, because the brand means "this ` +
      `build built it" and recordChange is the only place that is true. If a ` +
      `test needs an entry, call recordChange and read it back off ` +
      `sessionSnapshot() — that is one line, and it keeps the fixture on the ` +
      `same path the app uses.`,
  ).toEqual([])
})

/**
 * The stack's own reach. `authoringSession.ts` holds the array that
 * `executeRevert` is fed from, so it is the one module that could fill it with
 * something that did not come from `recordChange` — and everything it put
 * there would be branded, and correctly so by the type's own rule.
 *
 * The test files are not scanned for this: a test that imports a client is
 * testing something, and cannot put a row on the app's stack.
 */
const DATABASE_REACH =
  /@supabase\/supabase-js|\.from\(\s*['"`]|\.rpc\(|SupabaseClient/g

test('the session stack cannot be hydrated from a database', () => {
  const source = read(SESSION)
  const found = [...source.matchAll(DATABASE_REACH)].map((match) => {
    const line = source.slice(0, match.index).split('\n').length
    return `${SESSION}:${line} — ${match[0]}`
  })

  expect(
    found,
    `${SESSION} has grown a way to reach the database:\n  ${found.join('\n  ')}\n\n` +
      `The session array is filled by recordChange and by nothing else. A read ` +
      `here would put stored rows onto the stack through the front door, ` +
      `wearing the brand legitimately, and every guard downstream would agree ` +
      `they belonged. If the ledger is to become replayable, that is a version ` +
      `on the stored record and a parse per shape — not a read added here.`,
  ).toEqual([])
})

/** The ledger relations, by the names a read would have to spell. */
const LEDGER_RELATION = /authoring_changes|['"`]trash['"`]/g

test('the inverse-applier never names the ledger', () => {
  const source = read(APPLIER)
  const found = [...source.matchAll(LEDGER_RELATION)]
    .filter((match) => {
      // The header argues about the log at length, and has to name it to do
      // so. A comment cannot select anything; only code outside one can.
      const upToHere = source.slice(0, match.index)
      const lineStart = upToHere.lastIndexOf('\n') + 1
      return !/^\s*(\*|\/\/|\/\*)/.test(source.slice(lineStart, match.index))
    })
    .map((match) => {
      const line = source.slice(0, match.index).split('\n').length
      return `${APPLIER}:${line} — ${match[0]}`
    })

  expect(
    found,
    `${APPLIER} names a ledger relation in code:\n  ${found.join('\n  ')}\n\n` +
      `It writes the tables an inverse touches and reads none of them. A read ` +
      `of authoring_changes or trash from here is the replay this boundary ` +
      `exists to refuse, and it would arrive with the entry already in hand — ` +
      `past the one place the type could have stopped it.`,
  ).toEqual([])
})

test('the modules that state the boundary point at the check that keeps it', () => {
  // The issue this came from framed it as: a correct comment is the only thing
  // standing between the ledger and a runtime failure. The check is now the
  // load-bearing part, so the prose has to lead a reader to it rather than
  // restate a claim it no longer owns. Delete this file and these break.
  const dangling = [SESSION, APPLIER, LOG].filter(
    (relative) => !read(relative).includes('revertBoundaryContract'),
  )
  expect(
    dangling,
    `These state the audit-only claim without naming what enforces it: ` +
      `${dangling.join(', ')}. A reader who meets the claim should be one grep ` +
      `from the guard; otherwise the comment is load-bearing again.`,
  ).toEqual([])
})

test('the guards can fail', () => {
  // Every rule above is a pattern over source text, which is the kind of check
  // that passes because it matched nothing. Prove each matches the shape it
  // claims to and not the shape it permits.
  expect(
    SIGNATURE.test('export async function executeRevert(\n  client: Client,\n  entry: SessionEntry,\n)'),
  ).toBe(true)
  expect(
    SIGNATURE.test('export async function executeRevert(client: Client, entry: ChangeEntry)'),
  ).toBe(false)
  expect(
    SIGNATURE.test('export async function executeRevert(client: Client, entry: unknown)'),
  ).toBe(false)

  expect('entries = [...entries, entry as SessionEntry]'.match(MINT)).not.toBeNull()
  expect('return rows as unknown as SessionEntry[]'.match(MINT)).not.toBeNull()
  expect('const list: SessionEntry[] = sessionSnapshot()'.match(MINT)).toBeNull()

  expect("await client.from('authoring_changes').select('*')".match(DATABASE_REACH)).not.toBeNull()
  expect("import type { SupabaseClient } from '@supabase/supabase-js'".match(DATABASE_REACH)).not.toBeNull()
  expect("entries.filter((entry) => entry.id !== id)".match(DATABASE_REACH)).toBeNull()

  expect("from('authoring_changes')".match(LEDGER_RELATION)).not.toBeNull()
  expect("from('trash')".match(LEDGER_RELATION)).not.toBeNull()
  expect("from('slides')".match(LEDGER_RELATION)).toBeNull()
})
