// @vitest-environment jsdom
/**
 * A source is three fields and one note.
 *
 * The seam is the tab, not the form or the row, because the change is one
 * claim that spans all three: what an author is asked for, what reaches the
 * mutation, and what a reader gets back. A test that mounted the form alone
 * could not say whether the row still wears three type treatments, and a test
 * that asserted which column a value landed in would have gone green on the
 * shape this change exists to remove — `excerpt` was a real column holding
 * two values in 66 rows, one of them not a quote.
 *
 * So every assertion here is what a person sees: a label, a rendered anchor,
 * the absence of a separator. The one exception is the argument `addEvidence`
 * is called with, which is the agent-facing half of the same claim.
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CellEvidenceTab } from '@/components/blueprint/CellEvidenceTab'
import type { Evidence } from '@/types/database'

/** The draft the tab hands the mutation — the agent-facing half of the claim. */
type Draft = Record<string, unknown>
const addEvidence = vi.fn<(client: unknown, draft: Draft) => Promise<string>>(
  async () => 'e-new',
)
vi.mock('@/lib/evidenceMutations', () => ({
  addEvidence: (client: unknown, draft: Draft) => addEvidence(client, draft),
}))

/** The draft of the nth call, once one has been made. */
const draftOf = (call: number): Draft => {
  const args = addEvidence.mock.calls[call]
  if (!args) throw new Error(`addEvidence was not called ${call + 1} time(s)`)
  return args[1]
}
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: {}, configured: true, canWrite: true }),
}))
vi.mock('@/lib/service', () => ({
  resolveFirstServiceId: async () => 'svc-1',
}))

let rows: Evidence[] = []
vi.mock('@/hooks/useEvidence', () => ({
  useEvidence: () => ({ status: 'ready', data: rows, source: 'database' }),
  invalidateEvidence: () => {},
}))

const source = (over: Partial<Evidence> & { id: string }): Evidence =>
  ({
    cell_id: 'cell-1',
    cell_key: 'cell-1',
    proposition_question_key: null,
    kind: 'interview',
    title: 'Onboarding interview 4',
    note: null,
    observed_at: null,
    added_by: null,
    created_by: null,
    service_id: 'svc-1',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...over,
  }) as Evidence

const open = () => {
  const view = render(<CellEvidenceTab cellId="cell-1" />)
  fireEvent.click(view.getByRole('button', { name: 'Add source' }))
  return view
}

beforeEach(() => {
  rows = []
  addEvidence.mockClear()
})
afterEach(cleanup)

describe('the add-a-source form', () => {
  it('asks three questions, in one group, with no rule between them', () => {
    const view = open()
    const form = view.container.querySelector('form')
    expect(form).not.toBeNull()
    expect(form?.querySelector('hr')).toBeNull()
    expect(form?.querySelector('[role="separator"]')).toBeNull()
    // Three controls, and the count is the assertion: a fourth would be the
    // author sorting a sentence into boxes again.
    expect(
      form?.querySelectorAll('input, textarea, select'),
    ).toHaveLength(3)
  })

  it('labels every field, so no purpose is carried by grey text alone', () => {
    const view = open()
    for (const label of ['Kind', 'Title', 'Note']) {
      expect(view.getByText(label, { selector: 'span' })).toBeTruthy()
      expect(view.getByLabelText(label)).toBeTruthy()
    }
    expect(view.queryByLabelText('Source reference')).toBeNull()
    expect(view.queryByLabelText('Source excerpt')).toBeNull()
  })

  it('saves a source that is only a kind and a title', async () => {
    const view = open()
    fireEvent.change(view.getByLabelText('Title'), {
      target: { value: '  Metabase, 2026-08-08  ' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Add source' }))
    await waitFor(() => expect(addEvidence).toHaveBeenCalled())
    expect(draftOf(0)).toMatchObject({
      kind: 'interview',
      title: 'Metabase, 2026-08-08',
      note: null,
    })
  })

  it('sends the note as the one piece of prose, and nothing beside it', async () => {
    const view = open()
    fireEvent.change(view.getByLabelText('Title'), { target: { value: 'PR 1151' } })
    fireEvent.change(view.getByLabelText('Note'), {
      target: { value: 'Shipped behind a flag — https://example.com/pr/1151' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Add source' }))
    await waitFor(() => expect(addEvidence).toHaveBeenCalled())
    const draft = draftOf(0)
    expect(draft.note).toBe('Shipped behind a flag — https://example.com/pr/1151')
    expect(draft).not.toHaveProperty('ref')
    expect(draft).not.toHaveProperty('excerpt')
  })
})

describe('a saved source', () => {
  it('renders the kind as a word beside the title', () => {
    rows = [source({ id: 'e-1', kind: 'meeting', title: 'Warm-up review' })]
    const view = render(<CellEvidenceTab cellId="cell-1" />)
    const row = view.getByRole('listitem')
    expect(row.textContent).toContain('Warm-up review')
    expect(row.textContent).toContain('meeting')
  })

  it('carries the prose the renamed column holds, in one text treatment', () => {
    rows = [
      source({
        id: 'e-1',
        note: 'Team agreed every warm-up must state that help is available on demand',
      }),
    ]
    const view = render(<CellEvidenceTab cellId="cell-1" />)
    const row = view.getByRole('listitem')
    expect(row.textContent).toContain('help is available on demand')
    // The three that used to stack: a monospaced link, an italic passage, and
    // the rule down its left edge.
    expect(row.querySelector('.font-mono')).toBeNull()
    expect(row.querySelector('.italic')).toBeNull()
    expect(row.querySelector('.border-l-2')).toBeNull()
  })

  it('makes a URL written inside the note a link', () => {
    rows = [
      source({
        id: 'e-1',
        note: 'Numbers are in the dashboard: https://example.com/dash?q=1 — refreshed nightly.',
      }),
    ]
    const view = render(<CellEvidenceTab cellId="cell-1" />)
    const link = view.getByRole('link', { name: 'https://example.com/dash?q=1' })
    expect(link.getAttribute('href')).toBe('https://example.com/dash?q=1')
    expect(link.getAttribute('rel')).toContain('noopener')
    // The sentence around it survives as text.
    expect(view.getByRole('listitem').textContent).toContain('refreshed nightly.')
  })

  it('leaves a note with no URL alone', () => {
    rows = [source({ id: 'e-1', note: 'See the note in data-model.md' })]
    const view = render(<CellEvidenceTab cellId="cell-1" />)
    expect(view.queryByRole('link')).toBeNull()
  })
})
