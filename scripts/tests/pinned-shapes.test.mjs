import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  boundBlock,
  columnsOf,
  fencedBlocks,
  keysIn,
  shapeDrift,
} from '../pinned-shapes.mjs'

/**
 * #290 — a row shape pinned in prose, held against the schema.
 *
 * `agents/auditor.md` told a model to produce `check_name` and `note` for two
 * renames after the columns became `check_key` and `summary`. The document is
 * read by a model rather than a compiler, so the failure surfaced as the model
 * being wrong rather than the prose being stale.
 */

const root = fileURLToPath(new URL('../..', import.meta.url))
const schema = readFileSync(
  `${root}supabase/generated/portable-core.schema.sql`,
  'utf8',
)
const auditor = readFileSync(`${root}agents/auditor.md`, 'utf8')

const AUDITOR_BINDING = {
  anchor: '**Findings-row shape (pinned).**',
  relation: 'audit_findings',
  notColumns: ['reason', 'scope'],
  supplied: ['service_id'],
}

describe('the auditor findings-row shape', () => {
  it('agrees with the schema dump', () => {
    expect(shapeDrift({ ...AUDITOR_BINDING, source: auditor }, schema)).toEqual([])
  })

  it('would have caught the two names it shipped with', () => {
    const stale = auditor
      .replace('"check_key": "<roster check key>"', '"check_name": "<name>"')
      .replace('  "summary": "<text>",', '  "note": "<text>",')
    const problems = shapeDrift({ ...AUDITOR_BINDING, source: stale }, schema).map(
      (entry) => entry.problem,
    )
    expect(problems).toContain('"check_name" is not a column of audit_findings')
    // `note` IS a column — of `paths`, `scenarios` and `cell_dependencies`.
    // Only the binding to a relation makes it wrong here, which is the whole
    // argument for binding rather than pattern-matching.
    expect(problems).toContain('"note" is not a column of audit_findings')
  })

  it('notices a required column the shape never names', () => {
    const missing = auditor.replace('  "check_key": "<roster check key>",\n', '')
    expect(
      shapeDrift({ ...AUDITOR_BINDING, source: missing }, schema).map((e) => e.problem),
    ).toContain('audit_findings.check_key is required and the shape never names it')
  })
})

describe('reading a schema dump', () => {
  it('reads a table\'s columns and which of them are required', () => {
    const columns = columnsOf(schema, 'audit_findings')
    expect(columns.get('check_key')).toEqual({ required: true })
    // Defaulted, so a caller may omit it.
    expect(columns.get('status')).toEqual({ required: false })
    expect(columns.get('summary')).toEqual({ required: false })
  })

  it('does not mistake a constraint for a column', () => {
    expect([...columnsOf(schema, 'audit_findings').keys()]).not.toContain(
      'CONSTRAINT',
    )
    expect(
      [...columnsOf(schema, 'audit_findings').keys()].some((name) =>
        name.endsWith('_check'),
      ),
    ).toBe(false)
  })

  it('returns null for a table the dump does not declare', () => {
    expect(columnsOf(schema, 'findings')).toBe(null)
  })
})

describe('reading the document', () => {
  it('takes the fence AFTER the anchor, not the first in the file', () => {
    // `auditor.md` has two JSON fences: the auditor's own output shape, then
    // the pinned row. Binding to the first would check the wrong one.
    const block = boundBlock(auditor, AUDITOR_BINDING.anchor)
    expect(keysIn(block.body).has('check_key')).toBe(true)
    expect(keysIn(block.body).has('skip_reason')).toBe(false)
  })

  it('reports a missing anchor rather than passing quietly', () => {
    expect(
      shapeDrift({ ...AUDITOR_BINDING, anchor: 'no such sentence', source: auditor }, schema),
    ).toEqual([
      {
        relation: 'audit_findings',
        problem: 'no fenced block after "no such sentence"',
      },
    ])
  })

  it('finds fenced blocks with their language', () => {
    const blocks = fencedBlocks('a\n```json\n{"x": 1}\n```\nb\n```sql\nselect 1;\n```\n')
    expect(blocks.map((block) => block.language)).toEqual(['json', 'sql'])
    expect(blocks[0].body).toBe('{"x": 1}')
  })
})
