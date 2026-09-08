import { describe, expect, it } from 'vitest'
import { dispatchTool } from '@/lib/agent/tools/registry'
import {
  CELL_CONTENT_MAX,
  getCellContentLengthGuidance,
} from '@/lib/cellContentLimits'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * The cell-content budget advises the agent; it never eats the agent's text.
 *
 * The other half of that promise — that a long cell cannot change the height
 * of the row it sits in — is asserted where the geometry lives, in
 * `blueprintLayoutEstimate.test.ts`, against the layout estimate rather than
 * against any character count.
 *
 * Nothing here restates the budget: both fixtures are measured from
 * `CELL_CONTENT_MAX` and both expectations are derived from the guidance
 * itself, so moving the number moves this suite with it rather than breaking
 * it. What is pinned is the shape — the write lands whole, and the note is
 * added to the ordinary reply rather than replacing it.
 */

type Written = { fn: string; args: Record<string, unknown> }

const CELL_ID = 'cell-written'

/**
 * Enough of a client for one cell write: an empty slot for the occupancy
 * guard, a row for the pre-read, one written row for the update, and an RPC
 * that records what it was handed.
 */
function recordingClient(written: Written[] = []) {
  const chain = {
    select: () => chain,
    update: () => chain,
    eq: () => chain,
    or: () => chain,
    // The occupancy guard reads an empty slot, so the create path proceeds.
    limit: () => Promise.resolve({ data: [] as unknown[], error: null }),
    maybeSingle: () =>
      Promise.resolve({
        data: {
          content: 'What the cell said before',
          summary: null,
          status: 'live',
          owner: null,
          perceived_owner: null,
          function: null,
          form: null,
          value_props: null,
        },
        error: null,
      }),
    // Awaiting the builder itself is the write path's `.select('id')`.
    then: (
      resolve: (value: { data: unknown; error: null }) => unknown,
    ): unknown => resolve({ data: [{ id: CELL_ID }], error: null }),
  }
  return {
    from: () => chain,
    rpc: (fn: string, args: Record<string, unknown>) => {
      written.push({ fn, args })
      return Promise.resolve({ data: CELL_ID, error: null })
    },
  } as unknown as SupabaseClient<Database>
}

const OVER_BUDGET = 'a'.repeat(CELL_CONTENT_MAX + 1)
const WITHIN_BUDGET = 'a'.repeat(CELL_CONTENT_MAX)

function createCell(content: string, written: Written[] = []) {
  return dispatchTool(recordingClient(written), 'session', 'upsert_cell', {
    path_id: 'p',
    lane_id: 'l',
    step_id: 's',
    content,
  })
}

function editCell(content: string, written: Written[] = []) {
  return dispatchTool(recordingClient(written), 'session', 'update_cell', {
    cell_id: CELL_ID,
    content,
  })
}

describe('a cell write longer than the canvas budget', () => {
  it('lands, carrying every character the agent composed', async () => {
    const written: Written[] = []
    await createCell(OVER_BUDGET, written)
    const upsert = written.find((entry) => entry.fn === 'upsert_cell')
    expect(upsert?.args.content).toBe(OVER_BUDGET)
  })

  it('adds the guidance to the reply the write already earns', async () => {
    const note = getCellContentLengthGuidance(OVER_BUDGET).message
    expect(note).not.toBeNull()
    expect(getCellContentLengthGuidance(WITHIN_BUDGET).message).toBeNull()
    expect(await createCell(OVER_BUDGET)).toBe(
      `${await createCell(WITHIN_BUDGET)} ${note}`,
    )
  })

  it('edits the same way it creates — written, then advised', async () => {
    const note = getCellContentLengthGuidance(OVER_BUDGET).message
    expect(await editCell(OVER_BUDGET)).toBe(
      `${await editCell(WITHIN_BUDGET)} ${note}`,
    )
  })
})

describe('the guidance itself', () => {
  it('names the length it read and the budget it measured against', () => {
    const message = getCellContentLengthGuidance(OVER_BUDGET).message
    expect(message).toContain(String(OVER_BUDGET.length))
    expect(message).toContain(String(CELL_CONTENT_MAX))
  })

  it('hands back advice and nothing that could pass for the text', () => {
    // A guidance function that returned content would be a truncation in
    // disguise. Advice is the only thing it produces.
    const guidance = getCellContentLengthGuidance(OVER_BUDGET)
    expect(Object.values(guidance)).not.toContain(OVER_BUDGET)
    expect(guidance.overTarget).toBe(true)
    expect(getCellContentLengthGuidance(WITHIN_BUDGET).overTarget).toBe(false)
  })
})
