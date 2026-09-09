import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

/**
 * Nothing writes to a table except the modules that own the write path.
 *
 * The session ledger is the app's only undo, and it is only as complete as the
 * writes that reach it. A module that calls `.from('slides').update(…)`
 * itself skips the two steps every write is supposed to take — capture the
 * inverse before the write, `recordChange` after it — and neither omission is
 * visible at the call site. `SliceStoryboardField.tsx` set and cleared
 * `slides.illustration` that way, so replacing a slide image destroyed the
 * previous picture with no record that it had existed and no revert control;
 * `agent/tools/registry.ts` wrote `audit_findings` that way, so an audit run
 * rewrote findings a person had triaged and left nothing in the list saying
 * so — and a ⌘Z afterwards, finding no entry for the agent's write, reached
 * past it and took back the person's own last edit instead.
 *
 * The rule was prose, so nothing caught it for as long as it was wrong. This
 * test is the mechanism.
 *
 * **The walk starts at `src/`, deliberately.** A guard that scans a list of
 * named roots can only ever cover the directories that existed the day it was
 * written, and the two writers above sat in `components/` and in `lib/` — one
 * of them under a subtree three levels deep. Starting at the root and naming
 * the exceptions inverts that: a new directory is covered the moment it
 * appears, and a new writer has to argue for itself here.
 *
 * Two shapes look like violations and are not, so both are asserted below
 * rather than left to the regex's good behaviour:
 *
 * - **Reads are untouched.** The hooks are full of `.from(…).select(…)` and
 *   that is the correct place for them. Only the four write verbs count.
 * - **Storage is untouched.** `client.storage.from(BUCKET)` takes a bucket
 *   identifier, not a quoted table name, so an upload cannot trip this.
 *
 * The companion rule — that the modules permitted to write here translate a
 * refusal instead of forwarding the database's own text — is
 * `writeTranslationContract.test.ts`. The two share a subject and are
 * deliberately separate tests: this one asks who may write, that one asks what
 * a writer does when the write is refused.
 */
const SRC = resolve(__dirname, '..')

/**
 * A `src`-relative path that owns part of the write path.
 *
 * The `*Mutations.ts` family is matched by shape rather than listed, because
 * adding one is the *sanctioned* way to add a write and should not need an
 * edit here. The pattern is anchored at `lib/` on purpose: a
 * `components/FooMutations.ts` is not a mutation module, it is this test being
 * routed around.
 */
const MUTATION_MODULE = /^lib\/[A-Za-z]+Mutations\.ts$/

/**
 * The writers deliberately outside the `*Mutations` family, each with the
 * reason it is outside. Every one is asserted to exist below, so a rename
 * fails loudly instead of quietly widening the exemption to nothing.
 */
const EXEMPT: ReadonlyArray<{ path: string; because: string }> = [
  {
    path: 'lib/revertChange.ts',
    because:
      'the ledger’s own inverse-applier — it cannot record a change, because recording one is precisely what it is undoing',
  },
  {
    path: 'lib/agent/persistence.ts',
    because:
      'the agent transcript (agent_sessions, agent_messages), which is not blueprint data: it has no inverse to capture, and it is best-effort by design — the deployed read-only site has no policy on either table and every call there fails quietly on purpose',
  },
]

function isExempt(relative: string): boolean {
  return (
    MUTATION_MODULE.test(relative) ||
    EXEMPT.some((entry) => entry.path === relative)
  )
}

/**
 * `.from('table')` followed by a write verb.
 *
 * The window is generous because the verb is rarely adjacent — a formatted
 * chain puts `.update({…})` several lines and a whole payload after the
 * `.from`. The quoted table name is what keeps this off storage.
 */
const TABLE_WRITE =
  /\.from\(\s*'[a-z_]+'\s*\)[\s\S]{0,200}?\.(update|insert|upsert|delete)\s*\(/g

function walk(directory: string, prefix = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(directory).sort()) {
    const full = resolve(directory, entry)
    const relative = prefix ? `${prefix}/${entry}` : entry
    if (statSync(full).isDirectory()) out.push(...walk(full, relative))
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(relative)
  }
  return out
}

const sources = walk(SRC)

test('the walk sees the whole of src, not a list of roots', () => {
  // A walk that silently found nothing would pass every assertion below. Hold
  // it to the two facts that make the scan meaningful: it reaches files, and
  // it reaches them outside `lib/` — the named-roots version of this guard was
  // wrong in exactly the opposite direction, and either blind spot is fatal.
  expect(sources.length).toBeGreaterThan(0)
  expect(sources.some((one) => one.startsWith('components/'))).toBe(true)
  expect(sources.some((one) => one.startsWith('lib/'))).toBe(true)
  expect(sources.filter((one) => MUTATION_MODULE.test(one)).length).toBeGreaterThan(0)
})

test('every exempted writer still exists', () => {
  const missing = EXEMPT.filter(
    (entry) => !existsSync(resolve(SRC, entry.path)),
  ).map((entry) => entry.path)
  expect(
    missing,
    `Exempted from the write boundary but no longer present: ${missing.join(', ')}. ` +
      'If it moved, move the exemption with it; if it is gone, delete the exemption.',
  ).toEqual([])
})

test('nothing outside the mutation layer writes to a table directly', () => {
  const offenders: string[] = []

  for (const relative of sources) {
    if (isExempt(relative)) continue
    const source = readFileSync(resolve(SRC, relative), 'utf8')
    for (const match of source.matchAll(TABLE_WRITE)) {
      const line = source.slice(0, match.index).split('\n').length
      const table = match[0].match(/'([a-z_]+)'/)?.[1] ?? '?'
      offenders.push(`src/${relative}:${line} — ${match[1]} on '${table}'`)
    }
  }

  expect(
    offenders,
    offenders.length === 0
      ? ''
      : `Direct table writes outside the mutation layer:\n  ${offenders.join('\n  ')}\n\n` +
        'Move the write into src/lib/<area>Mutations.ts: read the previous ' +
        'value and carry it as the captured inverse, write with `.select()` ' +
        'so `requireRowsWritten` can tell a zero-row write from a successful ' +
        'one, then recordChange(). `setSlideIllustration` in sliceMutations.ts ' +
        'is the smallest complete example.',
  ).toEqual([])
})

test('reads and storage are not writes, and this says so', () => {
  // Both shapes are everywhere in the app and both are correct where they are.
  // Asserting them keeps a future widening of TABLE_WRITE from quietly
  // condemning the read layer or the upload path.
  expect("await client.from('cells').select('id, title').eq('id', id)".match(TABLE_WRITE)).toBeNull()
  expect(
    "client.storage.from(STORYBOARD_BUCKET).upload(path, file, { upsert: true })".match(
      TABLE_WRITE,
    ),
  ).toBeNull()
  expect("client.storage.from(BUCKET).remove([path])".match(TABLE_WRITE)).toBeNull()
})

test('the boundary rule can fail', () => {
  // A regex over source text passes just as happily when it matches nothing,
  // so prove it matches each verb in the shape a component would actually
  // write — including the multi-line one, which is the shape that reached
  // production.
  expect("await client.from('slides').update({ illustration: null }).eq('id', id)".match(TABLE_WRITE)).not.toBeNull()
  expect("await client.from('audit_findings').insert({ summary })".match(TABLE_WRITE)).not.toBeNull()
  expect("await client.from('agent_sessions').upsert({ id })".match(TABLE_WRITE)).not.toBeNull()
  expect("await client.from('slices').delete().eq('id', id)".match(TABLE_WRITE)).not.toBeNull()
  expect(
    ["const { error } = await client", "  .from('slides')", '  .update({', '    illustration: next,', '  })', "  .eq('id', itemId)"]
      .join('\n')
      .match(TABLE_WRITE),
  ).not.toBeNull()
})
