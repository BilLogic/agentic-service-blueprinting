import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { runTool, toolSpec } from '@/lib/agent/tools/definition'
import { getCellTool } from '@/lib/agent/tools/definitions/cells'
import { fakeToolContext } from '@/lib/agent/tools/definitions/testContext'
import { dispatchTool } from '@/lib/agent/tools/registry'

/*
 * The first tool that is one definition: its schema, its surface, its
 * availability and its `run` in one place, exercised through `run` with a
 * hand-built context. Nothing here goes through the dispatcher — the tool's
 * interface IS the test surface, and a caller that builds a context can run
 * any tool the same way.
 */

type Rec = { table: string; select?: string; calls: Array<[string, ...unknown[]]> }

function fakeClient(answer: (rec: Rec) => unknown): {
  client: SupabaseClient<Database>
  log: Rec[]
} {
  const log: Rec[] = []
  function builder(table: string) {
    const rec: Rec = { table, calls: [] }
    log.push(rec)
    const settle = () => Promise.resolve({ data: answer(rec), error: null })
    const b = {
      select(sel: string) {
        rec.select = sel
        return b
      },
      eq(...args: unknown[]) {
        rec.calls.push(['eq', ...args])
        return b
      },
      maybeSingle: settle,
    }
    return b
  }
  return {
    client: { from: (t: string) => builder(t) } as unknown as SupabaseClient<Database>,
    log,
  }
}

const ROW = {
  id: 'c-1',
  content: 'Customer asks for a quote',
  summary: null,
  owner: null,
  perceived_owner: null,
  function: null,
  form: null,
  value_props: null,
  lane_id: 'l-1',
  step_id: 's-1',
  position: 0,
  resources: [],
}

describe('get_cell as a tool definition', () => {
  it('reads the cell it is asked for through the client in its context', async () => {
    const { client, log } = fakeClient(() => ROW)
    const text = await runTool(getCellTool, { cell_id: 'c-1' }, fakeToolContext({ client }))
    expect(log[0]!.table).toBe('cells')
    expect(log[0]!.calls).toContainEqual(['eq', 'id', 'c-1'])
    expect(text).toContain('content: Customer asks for a quote')
  })

  it('answers from the bundled sample when the context has no client', async () => {
    const text = await runTool(
      getCellTool,
      { cell_id: 'no-such-cell' },
      fakeToolContext({ client: null }),
    )
    expect(text).toBe('No cell with id no-such-cell.')
  })

  it('refuses a malformed call with a message that names the argument', async () => {
    const { client, log } = fakeClient(() => ROW)
    await expect(
      runTool(getCellTool, {}, fakeToolContext({ client })),
    ).rejects.toThrow(/cell_id/)
    await expect(
      runTool(getCellTool, { cell_id: 42 }, fakeToolContext({ client })),
    ).rejects.toThrow(/cell_id/)
    expect(log).toEqual([])
  })

  it('derives the schema the model receives from the same definition', () => {
    const spec = toolSpec(getCellTool)
    expect(spec.name).toBe('get_cell')
    expect(spec.description).toMatch(/one cell/i)
    // Exactly the literal the spec table used to hold, plus the one rule the
    // dispatcher enforced by hand and the schema now states: a non-empty id.
    expect(spec.parameters).toEqual({
      type: 'object',
      properties: { cell_id: { type: 'string', minLength: 1, description: 'Cell id' } },
      required: ['cell_id'],
    })
  })

  it('declares its surface and where it may run', () => {
    expect(getCellTool.surface).toBe('read')
    expect(getCellTool.availability).toEqual({ sample: true, mobile: true })
  })
})

describe('the dispatcher runs a definition, and refuses one the trial does not offer', () => {
  it('runs get_cell from its definition with no client, through the sample', async () => {
    const text = await dispatchTool(null, 'session', 'get_cell', { cell_id: 'no-such-cell' })
    expect(text).toBe('No cell with id no-such-cell.')
  })
})
