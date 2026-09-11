import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The eval harness counts writes against the app's own write roster.
 *
 * It kept a hand list, and the hand list drifted the way a copy does: it named
 * `update_cell` twice and never learned about the evidence or stakeholder
 * writes, so a case asserting "no writes before the nod" passed while the
 * agent recorded a source or added someone to the cast. The roster is already
 * in the bundle the harness loads, so the cases import it rather than restate
 * it.
 */
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('the harness write list', () => {
  const cases = read('../agent-harness/cases.mjs')

  it('is imported from the app surface, not written out by hand', () => {
    expect(cases).toMatch(/import \{[^}]*\bWRITE_TOOL_NAMES\b[^}]*\} from '\.\/surface\.mjs'/)
    expect(cases).not.toMatch(/new Set\(\[\s*'create_step'/)
  })

  it('reaches the surface the runner uses, bundled once', () => {
    const run = read('../agent-harness/run.mjs')
    expect(run).toMatch(/from '\.\/surface\.mjs'/)
    expect(run).not.toMatch(/rolldown\(/)
  })
})
