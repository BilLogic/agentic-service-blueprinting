import { describe, expect, it } from 'vitest'
import {
  MOBILE_READ_TOOL_NAMES,
  TOOL_SPECS,
  WRITE_TOOL_NAMES,
} from '@/lib/agent/tools/specs'

/**
 * The mobile roster is the loop's one-pass filter: it must subsume the
 * tier filter (zero writes) or a mobile service account would get write
 * tools the shell cannot show landing. Pinned here so adding a tool to
 * the roster is a deliberate act, not a default.
 */
describe('mobile reading roster', () => {
  it('contains zero write tools', () => {
    const writes = [...MOBILE_READ_TOOL_NAMES].filter((name) =>
      WRITE_TOOL_NAMES.has(name),
    )
    expect(writes).toEqual([])
  })

  it('only names tools that exist in TOOL_SPECS', () => {
    const known = new Set(TOOL_SPECS.map((spec) => spec.name))
    const unknown = [...MOBILE_READ_TOOL_NAMES].filter(
      (name) => !known.has(name),
    )
    expect(unknown).toEqual([])
  })

  it('every write tool is declared in TOOL_SPECS', () => {
    const known = new Set(TOOL_SPECS.map((spec) => spec.name))
    const unknown = [...WRITE_TOOL_NAMES].filter((name) => !known.has(name))
    expect(unknown).toEqual([])
  })

  it('offers the reading core (grounded Q&A stays possible on a phone)', () => {
    for (const name of [
      'list_scenarios',
      'get_blueprint',
      'get_cell',
      'list_slices',
      'list_findings',
      'read_reference',
    ]) {
      expect(MOBILE_READ_TOOL_NAMES.has(name), name).toBe(true)
    }
  })
})
