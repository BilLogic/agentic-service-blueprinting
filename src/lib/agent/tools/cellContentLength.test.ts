import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dispatchTool } from '@/lib/agent/tools/registry'
import {
  configureCellBudget,
  getCellContentLengthGuidance,
} from '@/lib/cellContentLimits'
import { resolveDeploymentConfig } from '@/deploymentConfig'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * The cell-content budget advises; it never eats the text.
 *
 * The other half of that promise — that a long cell cannot change the height
 * of the row it sits in — is asserted where the geometry lives, in
 * `blueprintLayoutEstimate.test.ts`, against the layout estimate rather than
 * against any character count.
 *
 * Fixtures longer than the budget are measured from the CONFIGURED target,
 * not from a number restated here, so a deployment overlay moves this suite
 * with it. What is pinned is the shape — the write lands whole, and the note
 * is added to the ordinary reply rather than replacing it.
 */

type Written = { fn: string; args: Record<string, unknown> }

const CELL_ID = 'cell-written'

const TEMPLATE_PROSE = resolveDeploymentConfig().cellBudget.prose

afterEach(() => {
  configureCellBudget(resolveDeploymentConfig().cellBudget)
})

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

const OVER_BUDGET = 'a'.repeat(TEMPLATE_PROSE.target + 1)
const WITHIN_BUDGET = 'a'.repeat(TEMPLATE_PROSE.target)

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
    expect(message).toContain(String(TEMPLATE_PROSE.target))
  })

  it('hands back advice and nothing that could pass for the text', () => {
    // A guidance function that returned content would be a truncation in
    // disguise. Advice is the only thing it produces.
    const guidance = getCellContentLengthGuidance(OVER_BUDGET)
    expect(Object.values(guidance)).not.toContain(OVER_BUDGET)
    expect(guidance.overTarget).toBe(true)
    expect(guidance.overWarning).toBe(true)
    expect(getCellContentLengthGuidance(WITHIN_BUDGET).overTarget).toBe(false)
  })
})

describe('the budget comes from config, as target and warning per kind', () => {
  it('keeps the numbers out of the budget module', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/lib/cellContentLimits.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/\b120\b/)
    expect(src).not.toMatch(/\b80\b/)
    expect(src).not.toMatch(/\b100\b/)
    expect(src).not.toMatch(/\b32\b/)
    expect(src).not.toMatch(/\b48\b/)
  })

  it('names the configured target and warning for the kind it was asked about', () => {
    configureCellBudget({
      prose: { target: 40, warning: 60 },
      touchpointLabels: { target: 12, warning: 20 },
    })
    const overProseTarget = getCellContentLengthGuidance('p'.repeat(41), 'prose')
    expect(overProseTarget.target).toBe(40)
    expect(overProseTarget.warning).toBe(60)
    expect(overProseTarget.overTarget).toBe(true)
    expect(overProseTarget.overWarning).toBe(false)
    expect(overProseTarget.message).toContain('40')
    expect(overProseTarget.message).toContain('60')

    const overLabelWarning = getCellContentLengthGuidance(
      't'.repeat(21),
      'touchpointLabels',
    )
    expect(overLabelWarning.target).toBe(12)
    expect(overLabelWarning.warning).toBe(20)
    expect(overLabelWarning.overTarget).toBe(true)
    expect(overLabelWarning.overWarning).toBe(true)
    expect(overLabelWarning.message).toContain('12')
    expect(overLabelWarning.message).toContain('20')

    expect(getCellContentLengthGuidance('p'.repeat(40), 'prose').message).toBe(
      null,
    )
  })
})
