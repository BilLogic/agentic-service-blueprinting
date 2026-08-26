import { describe, expect, it } from 'vitest'
import {
  INTERFACE_TOOL_NAMES,
  READ_TOOL_NAMES,
  TOOL_SPECS,
  WRITE_TOOL_NAMES,
} from '@/lib/agent/tools/specs'

/**
 * Read, interface, write — three sets that cover the registry exactly once.
 *
 * `references/canvas-adapter.md` states the read and write surfaces as FULL,
 * and scripts/check-{read,write}-surface.mjs hold the document to these sets.
 * That only means anything while the sets themselves describe the registry:
 * a tool added to TOOL_SPECS and classified nowhere would be a tool the
 * document is never asked about. It fails here instead.
 */
describe('the agent tool surface partitions', () => {
  const registered = TOOL_SPECS.map((spec) => spec.name)

  it('classifies every registered tool exactly once', () => {
    const unclassified = registered.filter(
      (name) =>
        !READ_TOOL_NAMES.has(name) &&
        !INTERFACE_TOOL_NAMES.has(name) &&
        !WRITE_TOOL_NAMES.has(name),
    )
    expect(unclassified).toEqual([])
  })

  it('puts no tool in two of the three sets', () => {
    const doubled = registered.filter(
      (name) =>
        Number(READ_TOOL_NAMES.has(name)) +
          Number(INTERFACE_TOOL_NAMES.has(name)) +
          Number(WRITE_TOOL_NAMES.has(name)) >
        1,
    )
    expect(doubled).toEqual([])
  })

  it('classifies nothing that is not registered', () => {
    const known = new Set(registered)
    const phantom = [
      ...READ_TOOL_NAMES,
      ...INTERFACE_TOOL_NAMES,
      ...WRITE_TOOL_NAMES,
    ].filter((name) => !known.has(name))
    expect(phantom).toEqual([])
  })
})
