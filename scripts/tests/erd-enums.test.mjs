/**
 * The ERD's value sets, held to the constraints in the schema dump.
 *
 * `docs/erd.mmd` states values twice: an `%% Enums:` block at the top, and
 * `text kind "a | b | c"` attribute lines inside each entity. #98 renamed
 * the columns there and kept the retired values beside the new names, and
 * nothing noticed, because a Mermaid comment is neither JSX nor a code span.
 * Both are parsed here and compared, set for set, to the CHECK constraints
 * in `portable-core.schema.sql`.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SCHEMA } from '../check-instance-vocabulary.mjs'
import { catalogFromSchema } from '../value-set-claims.mjs'

const ROOT = process.cwd()
const TOKEN = /^[a-z][a-z0-9_-]*$/

/**
 * Every value-set claim in an ERD: `{ site, column, values }` where `column`
 * is `table.column` when the ERD qualifies it and a bare name otherwise.
 */
export function erdValueSets(mmd) {
  const claims = []
  const lines = mmd.split('\n')
  // The `%% Enums:` block — `%%` lines from the one that says Enums: to the
  // first `%%` line that starts another topic (`Integrity:`, `Roles:`).
  const start = lines.findIndex((line) => /^%%\s*Enums:/.test(line))
  for (let i = start; i >= 0 && i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.startsWith('%%')) break
    if (i > start && /^%%\s+[A-Z][a-z]+:/.test(line)) break
    for (const m of line.matchAll(/([a-z_]+(?:\.[a-z_]+)?)(?: \([^)]*\))? ∈ \(([^)]*)\)/g)) {
      claims.push({ site: `docs/erd.mmd:${i + 1}`, column: m[1], values: m[2].split('|').map((v) => v.trim()) })
    }
  }
  // Attribute lines inside `entity {` blocks: `text col "a | b | c…"`. A
  // description that is not a bare pipe list of tokens is prose.
  let entity = null
  lines.forEach((line, i) => {
    const open = /^\s{2}([a-z_]+) \{/.exec(line)
    if (open) entity = open[1]
    if (/^\s{2}\}/.test(line)) entity = null
    const attr = entity && /^\s+\w+ ([a-z_]+) "([^"]*)"/.exec(line)
    if (!attr) return
    const values = attr[2].split(/\s*\|\s*/).map((v) => v.trim())
    if (values.length < 2 || !values.every((v) => TOKEN.test(v))) return
    claims.push({ site: `docs/erd.mmd:${i + 1}`, column: `${entity}.${attr[1]}`, values })
  })
  return claims
}

/** The disagreements between ERD claims and the catalog, as messages. */
export function erdFindings(claims, catalog) {
  const show = (values) => `{${[...values].join(', ')}}`
  const findings = []
  for (const claim of claims) {
    const values = new Set(claim.values)
    const candidates = claim.column.includes('.')
      ? [catalog.columns.get(claim.column)].filter(Boolean).map((set) => ({ label: claim.column, set }))
      : (catalog.byColumn.get(claim.column) ?? []).map((key) => ({ label: key, set: catalog.columns.get(key) }))
    if (candidates.length === 0) {
      findings.push(`${claim.site} states values for \`${claim.column}\`, which no CHECK in the schema constrains — renamed, or never a column`)
      continue
    }
    const equal = (a, b) => a.size === b.size && [...a].every((v) => b.has(v))
    if (candidates.some((c) => equal(values, c.set.values))) continue
    findings.push(
      `${claim.site} says \`${claim.column}\` is ${show(values)}; ` +
        candidates.map((c) => `${c.label} accepts ${show(c.set.values)}`).join('; '),
    )
  }
  return findings
}

test('the parser reads both places the ERD states a value set', () => {
  const mmd = [
    '%% Enums: scenarios.layout ∈ (single | stacked)',
    '%%        origin (structure tables) ∈ (import | app); severity ∈ (info | warn | critical)',
    '%% Integrity: cells.path_id must match',
    'erDiagram',
    '  paths {',
    '    uuid id PK',
    '    text kind "happy | variant | exception"',
    '    text name "the CONDITION that routes you here"',
    '  }',
  ].join('\n')
  assert.deepEqual(erdValueSets(mmd), [
    { site: 'docs/erd.mmd:1', column: 'scenarios.layout', values: ['single', 'stacked'] },
    { site: 'docs/erd.mmd:2', column: 'origin', values: ['import', 'app'] },
    { site: 'docs/erd.mmd:2', column: 'severity', values: ['info', 'warn', 'critical'] },
    { site: 'docs/erd.mmd:7', column: 'paths.kind', values: ['happy', 'variant', 'exception'] },
  ])
})

test('the ERD agrees with the schema dump, set for set', () => {
  const catalog = catalogFromSchema(readFileSync(SCHEMA, 'utf8'))
  const findings = erdFindings(erdValueSets(readFileSync(`${ROOT}/docs/erd.mmd`, 'utf8')), catalog)
  assert.deepEqual(findings, [], `docs/erd.mmd states a value set the schema refutes:\n${findings.join('\n')}`)
})
