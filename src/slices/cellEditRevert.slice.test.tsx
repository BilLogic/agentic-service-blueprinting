// @vitest-environment jsdom
/**
 * THE CELL-EDIT-WITH-REVERT SLICE.
 *
 * One flow, end to end, through the real code at every layer but the wire:
 * a person edits a cell from the panel, saves, takes the change back from
 * the ledger, and the row reads back as it was. The panel is the real
 * `CellPanelEditor` over the real cell-detail provider; the save is the
 * real `saveCell` over the real content and spec mutations; the ledger is
 * the real `SessionChangesSheet` over the real session store; the revert is
 * the real `executeRevert`. What is fake is the database — an in-memory
 * `cells` table behind the calls these modules make — and two leaf reads the
 * panel makes of it (the value audiences and the registry touchpoints), so a
 * wrong read-back fails here rather than in a browser.
 *
 * This is the fallback the cell-edit slice ticket named, and the reason is
 * recorded where the hold it lifts is (the large-component-splits decision).
 * The fake is honest about what it cannot see: a grant or a policy.
 * `check:seed-load` asks the real database those questions, as the author,
 * for every column this slice writes.
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { inMemoryDatabase, type InMemoryDatabase, type Row } from '@/test/inMemoryDatabase'

/** The row as the database holds it before anyone edits: every column set, so a revert that restores four of five fields is caught. */
const ORIGINAL: Row = {
  id: 'cell-1',
  lane_id: 'lane-1',
  step_id: 'step-1',
  position: 0,
  content: 'Dispatcher confirms the address',
  summary: 'Books a crew',
  owner: 'Dispatch',
  perceived_owner: 'The installer',
  status: 'planned',
  function: 'Confirm the job',
  form: 'A phone call',
  value_props: [{ for: 'Customer', value: 'A booked slot' }],
  frame: null,
}

const db = vi.hoisted(() => ({ current: null as null | InMemoryDatabase }))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: db.current!.client, configured: true, canWrite: true }),
}))
// Two leaf reads the panel makes that are not this flow's: the audiences
// the value-proposition datalist suggests, and the registry placements.
vi.mock('@/hooks/useValueAudiences', () => ({
  useValueAudiences: () => ({ status: 'ready', data: [] }),
}))
vi.mock('@/hooks/useRegistryTouchpoints', () => ({
  useRegistryTouchpoints: () => ({ status: 'ready', data: [] }),
  useNameOnlyPlacements: () => ({ status: 'ready', data: [] }),
}))

import { CellPanelEditor } from '@/components/blueprint/CellPanelEditor'
import { SessionChangesSheet } from '@/components/editor/SessionChangesSheet'
import { BlueprintCellDetailProvider } from '@/contexts/BlueprintCellDetailContext'
import { clearSession, sessionSnapshot } from '@/lib/authoringSession'
import { normalizeBlueprint } from '@/lib/normalizeBlueprint'
import { queryClient } from '@/lib/queryClient'
import type { BlueprintData } from '@/types/blueprint'

/** The board the panel was opened from, normalized from the database's own rows the way the canvas read does. */
function boardFrom(database: InMemoryDatabase): BlueprintData {
  return normalizeBlueprint({
    id: 'path-1',
    name: 'Happy path',
    kind: 'happy',
    lanes: [{ id: 'lane-1', name: 'Dispatch', position: 0 }],
    path_steps: [{ position: 0, steps: { id: 'step-1', name: 'Confirm' } }],
    cells: database.tables.cells as never,
  })
}

/** The panel over the real provider, the way the drawer mounts it. */
function renderPanel(onDone: () => void) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BlueprintCellDetailProvider blueprints={[boardFrom(db.current!)]}>
        <CellPanelEditor cellId="cell-1" onDone={onDone} />
      </BlueprintCellDetailProvider>
    </QueryClientProvider>,
  )
}

/**
 * The control under a field's label. `Field` labels its control by position
 * rather than `for`, so there is no accessible name to ask for; the label's
 * text is the descriptor's, and the control is the first one under the same
 * field wrapper.
 */
function controlOf(label: string): HTMLTextAreaElement | HTMLInputElement {
  let node: HTMLElement | null = screen.getByText(label)
  while (node) {
    const control = node.querySelector<HTMLTextAreaElement | HTMLInputElement>('textarea, input')
    if (control) return control
    node = node.parentElement
  }
  throw new Error(`no control under the field labelled ${label}`)
}

/** The row as the database holds it now, through the same client the flow wrote with. */
async function readBack(): Promise<Row | null> {
  const { data } = await db.current!.client.from('cells').select('*').eq('id', 'cell-1').maybeSingle()
  return data as Row | null
}

/** Edit the summary and the function from the panel, and save. */
async function editAndSave() {
  const onDone = vi.fn()
  renderPanel(onDone)
  fireEvent.change(controlOf('Summary'), { target: { value: 'Books a crew and confirms by text' } })
  fireEvent.change(controlOf('Function'), { target: { value: 'Confirm the job and the crew' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
}

const EDITED: Row = {
  ...ORIGINAL,
  summary: 'Books a crew and confirms by text',
  function: 'Confirm the job and the crew',
}

beforeEach(() => {
  clearSession()
  queryClient.clear()
})

afterEach(() => {
  cleanup()
  clearSession()
})

describe('a cell is edited from the panel, saved, and reverted from the ledger', () => {
  it('writes both halves on save and reads back the original after both reverts', async () => {
    db.current = inMemoryDatabase({ cells: [ORIGINAL] })
    await editAndSave()

    // The database holds the edit — both columns, nothing else moved — and
    // the ledger holds one entry per write path, each with its inverse.
    expect(await readBack()).toEqual(EDITED)
    expect(sessionSnapshot().map((entry) => entry.fn)).toEqual(['update_cell_content', 'update_cell_spec'])
    expect(sessionSnapshot().every((entry) => entry.revert)).toBe(true)

    // Take both back from the ledger, the way a person does: open the
    // change sheet and press Revert on each row.
    render(<SessionChangesSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Review 2 changes' }))
    for (const remaining of [1, 0]) {
      const [revert] = screen.getAllByRole('button', { name: 'Revert this change' })
      fireEvent.click(revert!)
      await vi.waitFor(() => expect(sessionSnapshot()).toHaveLength(remaining))
    }

    // The row reads back as it was, column for column.
    expect(await readBack()).toEqual(ORIGINAL)
    // The content write synced the placements each time the text was
    // written: once on save, once on revert. Nothing else reached an RPC.
    expect(db.current.rpcs.map((call) => call.fn)).toEqual(['sync_cell_touchpoints', 'sync_cell_touchpoints'])
  })

  it('goes red on a wrong read-back: a column the database does not land', async () => {
    // The instrument, proved against a real shape of defect: a column the
    // grant forgot lands nothing, and the same read-back assertion the case
    // above makes after Save no longer holds.
    db.current = inMemoryDatabase({ cells: [ORIGINAL] }, { dropOnWrite: ['function'] })
    await editAndSave()
    const row = await readBack()
    expect(row).not.toEqual(EDITED)
    expect(row).toMatchObject({ summary: EDITED.summary, function: ORIGINAL.function })
  })
})
