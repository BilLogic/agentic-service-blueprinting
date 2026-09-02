/**
 * The ERD's value sets, held to the constraints in the schema dump.
 *
 * `docs/erd.mmd` states values twice: an `%% Enums:` block at the top, and
 * `text kind "a | b | c"` attribute lines inside each entity. #98 renamed
 * the columns there and kept the retired values beside the new names, and
 * nothing noticed, because a Mermaid comment is neither JSX nor a code span.
 * `scripts/erd-value-sets.mjs` parses both — the instance carries the same
 * file — and this holds them, set for set, to the CHECK constraints in
 * `portable-core.schema.sql`.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SCHEMA } from '../check-instance-vocabulary.mjs'
import { erdFindings, erdValueSets } from '../erd-value-sets.mjs'
import { catalogFromSchema } from '../value-set-claims.mjs'

const ROOT = process.cwd()

test('the parser reads both places the ERD states a value set', () => {
  const mmd = [
    '%% Enums: scenarios.layout ∈ (single | stacked)',
    '%%        origin (structure tables) ∈ (import | app); severity ∈ (info | warn | critical)',
    '%%        evidence.kind ∈ (interview | survey |',
    '%%                         doc | other)',
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
    { site: 'docs/erd.mmd:3', column: 'evidence.kind', values: ['interview', 'survey', 'doc', 'other'] },
    { site: 'docs/erd.mmd:9', column: 'paths.kind', values: ['happy', 'variant', 'exception'] },
  ])
})

test('the ERD agrees with the schema dump, set for set', () => {
  const catalog = catalogFromSchema(readFileSync(SCHEMA, 'utf8'))
  const findings = erdFindings(erdValueSets(readFileSync(`${ROOT}/docs/erd.mmd`, 'utf8')), catalog)
  assert.deepEqual(findings, [], `docs/erd.mmd states a value set the schema refutes:\n${findings.join('\n')}`)
})
