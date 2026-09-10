#!/usr/bin/env node
/**
 * Which SQL functions write their own row into the authoring change log.
 *
 * Folding `deleted_structure` into `public.authoring_changes` left the log
 * with two writers rather than one. The client appends through
 * `record_authoring_change` for every ordinary write; the delete functions
 * append their own row, because the payload can only be captured inside the
 * same transaction as the cascade that destroys it.
 *
 * That split needs exactly one thing to stay true: the client must skip its
 * own append for precisely the operations the database already recorded. Skip
 * too many and a delete leaves no trace; skip too few and one delete becomes
 * two rows, one of them with no payload — two records of one event, only one
 * of which can restore anything.
 *
 * `ARCHIVED_BY_THE_DATABASE` in `src/lib/authoringLog.ts` is that skip set,
 * and this is the other half of the comparison: the set read out of the SQL.
 * `scripts/tests/authoring-log.test.mjs` holds them together, so adding a
 * seventh archiving function without a line in the client fails a test rather
 * than silently double-recording.
 *
 * IT MATCHES BOTH RELATION NAMES ON PURPOSE. The migration series still says
 * `deleted_structure` inside all six bodies, because the redirect is a
 * `pg_get_functiondef` sweep that rewrites what is INSTALLED — the files are
 * not the apply path, and rewriting the bodies in place would have had to
 * pick one deployment's spelling of the renamed relations and break the rest.
 * So the archivers are still spelled the old way in the repository and the
 * new way in the database, and this reads either.
 *
 * IT KEYS ON `payload`, NOT ON THE RELATION. `record_authoring_change` also
 * inserts into `authoring_changes` and is not an archiver: it takes no payload
 * parameter at all, which is what stops a client from claiming to have deleted
 * something. Matching the relation alone would sweep it in and demand the
 * client skip its own append seam.
 *
 * Static, needs no database.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * An insert into the log whose column list carries `payload` — i.e. one that
 * is archiving destroyed rows rather than recording a call.
 */
const ARCHIVING_INSERT =
  /insert\s+into\s+public\.(?:deleted_structure|authoring_changes)\s*\(([^)]*)\)/gi

/** `create or replace function public.name(` — the head of a definition. */
const FUNCTION_HEAD = /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(/gi

/** A top-level `do $tag$ … $tag$;` block, dollar quotes and all. */
const DO_BLOCK = /\bdo\s+(\$\w*\$)[\s\S]*?\1\s*;/gi

/** A `--` comment to end of line. */
const LINE_COMMENT = /--[^\n]*/g

/**
 * The functions defined in one file that archive.
 *
 * A definition runs until the next definition begins, which is coarse and is
 * enough: the question is which function's text an archiving insert falls
 * inside, and nothing in this series opens a second definition before closing
 * the first.
 *
 * COMMENTS AND `do` BLOCKS COME OUT FIRST, and that is not tidying — both
 * are shapes the folding migration actually has. It quotes the before-and-after
 * of the redirect in a `--` comment, and it carries the rewritten insert as a
 * STRING inside the `do` block that performs the sweep. Both sit after the
 * last `create function` in the file, so without this they are attributed to
 * whichever function was defined above them and the check reports an archiver
 * that archives nothing.
 *
 * `--` inside a string literal comes out too, which is wrong in general and
 * harmless here: no migration in this series puts one in a place that changes
 * which function an insert belongs to, and the alternative is a SQL lexer for
 * a question that does not need one.
 */
export function archivingFunctions(source) {
  const sql = source.replace(LINE_COMMENT, '').replace(DO_BLOCK, '')
  const heads = [...sql.matchAll(FUNCTION_HEAD)].map((match) => ({
    name: match[1],
    at: match.index,
  }))
  if (heads.length === 0) return []
  const found = new Set()
  for (const insert of sql.matchAll(ARCHIVING_INSERT)) {
    const columns = insert[1]
    if (!/\bpayload\b/i.test(columns)) continue
    // The last definition that opened before this insert.
    let owner = null
    for (const head of heads) {
      if (head.at < insert.index) owner = head.name
      else break
    }
    if (owner) found.add(owner)
  }
  return [...found].sort()
}

/** Every archiving function named anywhere in a migration directory. */
export function archivingFunctionsIn(dir) {
  const found = new Set()
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.sql'))) {
    for (const fn of archivingFunctions(readFileSync(join(dir, name), 'utf8'))) {
      found.add(fn)
    }
  }
  return [...found].sort()
}
