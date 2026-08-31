/**
 * Check D — a word this template ships to an agent is a word this template defines.
 *
 * #86: `skills/audit/SKILL.md` tells an agent to read "the spec columns" and
 * `skills/slice/SKILL.md` told it to apply "the derived-layer migrations",
 * while `CONTEXT.md` — the file that exists to be the vocabulary — had never
 * heard of either. Both words were published, in shipped skill documents, to
 * every instance built from this template.
 *
 * Two halves, and they fail differently:
 *
 * **RETIRED SPELLINGS.** "derived layer" is built on `layer`, which `21000104`
 * retired when `layers` became `lanes`, and it is wrong on its own terms —
 * only `findings` is derived, because a human may author a slice. Nothing in
 * the catalogue ever carried the phrase, so no database check can reach it and
 * `check-retired-identifiers` never will. It is prose, so only a prose sweep
 * finds it.
 *
 * **UNDEFINED LOAD-BEARING WORDS.** The opposite failure. `spec` and
 * `analysis tier` are the current, correct words; the defect is that an agent
 * is instructed to use them and given nowhere to look them up. A word the
 * skills depend on must be defined where a reader looks for definitions.
 *
 * SUBJECT: the text this template *publishes* — `CONTEXT.md`, `AGENTS.md`, and
 * markdown under `skills/`, `references/` and `docs/`. Not source comments,
 * which no agent reads, and not the three exempt classes below.
 *
 * THE EXEMPTION IS A RULE, NOT A LIST: **an applied or dated record keeps the
 * spelling it was written with.** Migrations every instance has already run,
 * the files generated from them, and changelog entries for shipped releases all
 * say what was true when they were written. Rewriting an applied migration to
 * tidy a comment makes applied migrations mutable, which costs more than the
 * tidiness is worth. `CONTEXT.md`'s "Words that keep a retired spelling"
 * records the same rule in prose for the person running the next sweep.
 *
 * IF THIS PRODUCES A FALSE POSITIVE, NARROW THE SUBJECT — NEVER THE WORD LIST.
 * A retired word dropped to silence one legitimate use becomes a rule that
 * never covered it, and the next person cannot tell the difference.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname)
const RERUN = 'npm test -- scripts/tests/agent-vocabulary.test.mjs'

/** The trees whose markdown is published to an agent or to a reader. */
const PUBLISHED_DIRS = ['skills', 'references', 'docs']
const PUBLISHED_FILES = ['CONTEXT.md', 'AGENTS.md', 'README.md']

/**
 * Applied or dated records, which keep their spelling.
 *
 * `docs/` is swept, so the one file inside it that transcribes migration
 * headers is named here rather than the whole tree being dropped.
 */
const EXEMPT = [
  'supabase/migrations/',
  'supabase/generated/',
  'CHANGELOG.md',
]

/** Retired prose spellings, and what to say instead. */
const RETIRED_PROSE = [
  { pattern: /derived[\s-]+layer/gi, use: 'analysis tier' },
]

/**
 * Words the skills instruct an agent to use, which therefore have to be
 * DEFINED — not merely present.
 *
 * The distinction is the whole check, and getting it wrong made this vacuous
 * the first time: a substring search for "spec" is satisfied by "specific",
 * "respective" and "specification", so deleting the definition outright left
 * the test green. `CONTEXT.md` opens every definition with the term in bold,
 * so that is what is looked for.
 */
const MUST_BE_DEFINED = ['Analysis tier', 'Spec']

function guardFailure(location, message) {
  return `${location}: ${message}\nRun: ${RERUN}`
}

function retiredVocabularyFailure(offenders) {
  const location = offenders[0]?.split(' — ')[0] ?? 'scripts/tests/agent-vocabulary.test.mjs:1'
  return guardFailure(
    location,
    `Retired vocabulary in text this template publishes:\n  ${offenders.join('\n  ')}\n\n` +
      `These are shipped to every instance built from this template. Applied ` +
      `migrations, generated files and changelog entries are exempt — an applied ` +
      `or dated record keeps the spelling it was written with.`,
  )
}

function missingDefinitionsFailure(missing) {
  return guardFailure(
    'CONTEXT.md:1',
    `Not defined in CONTEXT.md: ${missing.join(', ')} — a definition is a ` +
      `bolded term followed by an em dash, the shape every other entry uses. ` +
      `A skill instructs an agent to use these words (see skills/audit/SKILL.md ` +
      `on the spec columns). A word an agent is told to read has to be defined ` +
      `where a reader looks for definitions.`,
  )
}

test('guard failures name a source line and the focused rerun command', () => {
  assert.equal(
    retiredVocabularyFailure(['skills/slice/SKILL.md:16 — "derived layer", use "analysis tier"']),
    'skills/slice/SKILL.md:16: Retired vocabulary in text this template publishes:\n' +
      '  skills/slice/SKILL.md:16 — "derived layer", use "analysis tier"\n\n' +
      'These are shipped to every instance built from this template. Applied migrations, ' +
      'generated files and changelog entries are exempt — an applied or dated record keeps ' +
      'the spelling it was written with.\n' +
      'Run: npm test -- scripts/tests/agent-vocabulary.test.mjs',
  )
  assert.equal(
    missingDefinitionsFailure(['Spec']),
    'CONTEXT.md:1: Not defined in CONTEXT.md: Spec — a definition is a bolded term followed ' +
      'by an em dash, the shape every other entry uses. A skill instructs an agent to use ' +
      'these words (see skills/audit/SKILL.md on the spec columns). A word an agent is told ' +
      'to read has to be defined where a reader looks for definitions.\n' +
      'Run: npm test -- scripts/tests/agent-vocabulary.test.mjs',
  )
})

function markdownUnder(dir) {
  const root = resolve(REPO_ROOT, dir)
  const out = []
  let entries
  try {
    entries = readdirSync(root)
  } catch {
    return out
  }
  for (const name of entries) {
    const path = resolve(root, name)
    if (statSync(path).isDirectory()) {
      out.push(...markdownUnder(relative(REPO_ROOT, path)))
    } else if (name.endsWith('.md')) {
      out.push(path)
    }
  }
  return out
}

function publishedMarkdown() {
  const files = [
    ...PUBLISHED_DIRS.flatMap(markdownUnder),
    ...PUBLISHED_FILES.map((name) => resolve(REPO_ROOT, name)),
  ]
  return files.filter((path) => {
    const rel = relative(REPO_ROOT, path)
    return !EXEMPT.some((prefix) => rel.startsWith(prefix))
  })
}

test('no retired prose spelling reaches a published document', () => {
  const offenders = []
  for (const path of publishedMarkdown()) {
    let source
    try {
      source = readFileSync(path, 'utf8')
    } catch {
      continue
    }
    const rel = relative(REPO_ROOT, path)
    /*
      `CONTEXT.md` documents its own retirements, and has to be able to name the
      word it is retiring — "a sweep that catches every occurrence of a retired
      word needs to know which occurrences are not residue" is that file's own
      sentence about itself. So the sweep stops at the rename map rather than
      skipping the file: the DEFINITIONS above it are still checked, and only the
      sections whose subject IS the retired vocabulary are allowed to say it.
    */
    const stopAt =
      rel === 'CONTEXT.md' && source.includes('## The rename map')
        ? source.indexOf('## The rename map')
        : Infinity
    for (const { pattern, use } of RETIRED_PROSE) {
      for (const match of source.matchAll(pattern)) {
        if (match.index >= stopAt) continue
        // A migration FILENAME is an applied record too: the file is named
        // `..._derived_layer.sql` on every instance and renaming the reference
        // would point at a file that does not exist.
        const around = source.slice(Math.max(0, match.index - 40), match.index + 60)
        if (/_derived_layer[\w.]*\.sql/.test(around) && /_/.test(match[0])) continue
        const line = source.slice(0, match.index).split('\n').length
        offenders.push(`${rel}:${line} — "${match[0]}", use "${use}"`)
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    retiredVocabularyFailure(offenders),
  )
})

test('every word the skills are told to use is defined in CONTEXT.md', () => {
  const context = readFileSync(resolve(REPO_ROOT, 'CONTEXT.md'), 'utf8')
  const missing = MUST_BE_DEFINED.filter(
    (term) => !new RegExp(`^\\*\\*${term}\\*\\* —`, 'mi').test(context),
  )
  assert.deepEqual(
    missing,
    [],
    missingDefinitionsFailure(missing),
  )
})

test('the sweep can fail', () => {
  // The guard above is a regex over prose, which is the kind of check that
  // passes because it matched nothing. Prove it matches what it claims to,
  // and does not match the applied-filename case it permits.
  const [{ pattern }] = RETIRED_PROSE
  const hits = (text) => [...text.matchAll(new RegExp(pattern.source, pattern.flags))]
  assert.equal(hits('apply the derived-layer migrations').length, 1)
  assert.equal(hits('the derived layer exists').length, 1)
  assert.equal(hits('Derived Layer: slices, findings').length, 1)
  assert.equal(hits('the analysis tier exists').length, 0)
})

test('the definition check can fail, and is not satisfied by a substring', () => {
  // "spec" appears inside "specific" and "respective". The first version of
  // this check searched for the bare word and stayed green with the definition
  // deleted.
  const defined = (term, text) => new RegExp(`^\\*\\*${term}\\*\\* —`, 'mi').test(text)
  assert.equal(defined('Spec', '**Spec** — the descriptive detail hanging off a board object.'), true)
  assert.equal(defined('Spec', 'the specific respective specification of a spec'), false)
  assert.equal(defined('Analysis tier', '**Analysis tier** — the four tables that…'), true)
  assert.equal(defined('Analysis tier', 'see the analysis tier section'), false)
})
