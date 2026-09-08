#!/usr/bin/env node
/**
 * The shipped half of `scripts/pinned-shapes.mjs`: every row shape a document
 * pins, held against `supabase/generated/portable-core.schema.sql`.
 *
 *   npm run check:pinned-shapes
 *
 * The bindings are short on purpose. A JSON fence is only a row shape when the
 * prose around it says so, and most of them are not: of the four fenced blocks
 * in `agents/`, `skills/` and `references/`, three document an agent's own
 * output or a workspace state file. Adding a binding is how a document's claim
 * becomes checkable — never a default applied to every fence.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shapeDrift } from './pinned-shapes.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCHEMA = join(ROOT, 'supabase/generated/portable-core.schema.sql')

const BINDINGS = [
  {
    file: 'agents/auditor.md',
    anchor: '**Findings-row shape (pinned).**',
    relation: 'audit_findings',
    // Neither is stored. `audit_tools.py` folds both into the fingerprint and
    // drops them, which is why the document has to ask for them and the
    // schema has nowhere to put them.
    notColumns: ['reason', 'scope'],
    // The dispatching context knows which service the run is against; the
    // auditor does not, and asking it would invite a guess.
    supplied: ['service_id'],
  },
]

const schemaSql = readFileSync(SCHEMA, 'utf8')
const drift = BINDINGS.flatMap((binding) =>
  shapeDrift({ ...binding, source: readFileSync(join(ROOT, binding.file), 'utf8') }, schemaSql).map(
    (problem) => ({ ...problem, file: binding.file }),
  ),
)

if (drift.length > 0) {
  console.error('A pinned row shape disagrees with the schema:\n')
  for (const { file, problem } of drift) console.error(`  ${file}: ${problem}`)
  console.error(
    '\nThe document is read by a model, so a stale key here is a call the app rejects.',
  )
  process.exit(1)
}

console.log(
  `${BINDINGS.length} pinned row shape(s) agree with the schema dump.`,
)
