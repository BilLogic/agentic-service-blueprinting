import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defineWriteTool } from '@/lib/agent/tools/definition'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'

/*
 * THE THREE FACTS A WRITE CANNOT FORGET, pinned at the function that fixes
 * them rather than only on the writes that exist today.
 *
 * `availability` is the one the ROSTER leans on. The offer applies its gates
 * in sequence — trial, then mobile, then the write gate — so a tool that was
 * BOTH trial-or-mobile-available AND a write would be answered by the write
 * gate, where the earlier early-returning shape would have offered it at the
 * mode gate above. That difference is a no-op today only because every write
 * is off the trial and off the phone by construction, and "by construction"
 * is what these cases hold: `defineWriteTool` states the pair itself and its
 * parameter type has no slot for a caller to state a different one, so a
 * future write declared mobile-available cannot change the offer quietly —
 * it has to stop being a `defineWriteTool` first, which is a diff a reader
 * sees.
 */

const noopWrite = () =>
  defineWriteTool({
    name: 'rehearse_nothing',
    description: 'A write that exists only in this test.',
    args: z.object({ id: z.string() }),
    run: async () => 'done',
  })

describe('defineWriteTool fixes what a write is', () => {
  it('puts a write on the write surface, off the trial and off the mobile shell', () => {
    const tool = noopWrite()
    expect(tool.surface).toBe('write')
    expect(tool.availability).toEqual({ sample: false, mobile: false })
  })

  it('takes no availability from its caller', () => {
    // The compile-time half of the same statement, and the half that holds
    // for a tool nobody has written yet: the parameter type has no
    // `availability` key, so a write cannot be declared available anywhere.
    defineWriteTool({
      name: 'rehearse_nothing',
      description: 'A write that exists only in this test.',
      args: z.object({ id: z.string() }),
      // @ts-expect-error availability is not a caller's to state on a write
      availability: { sample: true, mobile: true },
      run: async () => 'done',
    })
  })

  it('and every write the template ships was built that way', () => {
    const writes = TOOL_DEFINITIONS.filter((tool) => tool.surface === 'write')
    expect(writes.length).toBeGreaterThan(0)
    for (const tool of writes)
      expect(tool.availability, tool.name).toEqual({ sample: false, mobile: false })
  })
})
