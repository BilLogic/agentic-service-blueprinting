import { describe, expect, it } from 'vitest'
import { formatEvidenceDetail, formatEvidenceList } from '@/lib/agent/tools/format'
import { TOOL_SPECS } from '@/lib/agent/tools/specs'

/**
 * The agent asks for a source the way the form does: one prose argument.
 *
 * It had two — `ref` and `excerpt` — and could write both the whole time. In
 * production it never wrote `ref` once, which is what makes zero rows a fact
 * about the field rather than about the surface. The tools now carry `note`,
 * and the descriptions stop calling it a quoted passage: a model reads the
 * description as the field's definition, so "the quoted passage that carries
 * the claim" is an instruction not to write an observation there.
 */
const spec = (name: string) => {
  const found = TOOL_SPECS.find((entry) => entry.name === name)
  if (!found) throw new Error(`no tool spec named ${name}`)
  return found
}

const args = (name: string) =>
  Object.keys(spec(name).parameters.properties ?? {})

describe('the evidence tools', () => {
  it('take one prose argument and no reference', () => {
    for (const name of ['create_evidence', 'update_evidence']) {
      expect(args(name)).toContain('note')
      expect(args(name)).not.toContain('ref')
      expect(args(name)).not.toContain('excerpt')
    }
  })

  it('still require only a cell, a kind and a title to record one', () => {
    expect(spec('create_evidence').parameters.required).toEqual([
      'cell_id',
      'kind',
      'title',
    ])
  })

  it('describe the note as prose rather than as a quotation', () => {
    const properties = spec('create_evidence').parameters.properties as Record<
      string,
      { description?: string }
    >
    const note = properties.note?.description ?? ''
    expect(note).toMatch(/observation/i)
    expect(note).not.toMatch(/quoted passage/i)
  })
})

describe('what the agent reads back', () => {
  const row = {
    id: 'e-1',
    cell_id: 'c-1',
    kind: 'meeting',
    title: 'Warm-up review',
    note: 'Help is on demand — https://example.com/notes',
    observed_at: '2026-08-08',
  }

  it('lists a source without a locator field', () => {
    const line = formatEvidenceList([row], 'c-1')
    expect(line).toContain('[meeting] "Warm-up review"')
    expect(line).not.toContain('ref=')
  })

  it('reads the note out in full', () => {
    expect(formatEvidenceDetail([row], ['e-1'])).toContain(
      '  note: Help is on demand — https://example.com/notes',
    )
  })
})
