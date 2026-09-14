// @vitest-environment jsdom
/**
 * THE AGENT-SESSION SLICE.
 *
 * One flow, end to end, through the real code at every layer but the wire:
 * a person opens the agent panel, starts a session, sends a message; the
 * loop runs a read tool, then a write tool; the panel renders the turn, the
 * tool calls and what came back; the write lands on the authoring ledger
 * wearing the session's ✦ attribution; the person takes it back from the
 * change sheet and the row reads back as it was; and the transcript reads
 * back out of the persisted rows after the panel is closed and reopened.
 *
 * The panel is the real `AgentPanel`, the loop is the real `sendToAgent`,
 * the tools are the real `get_cell` and `update_cell` definitions over the
 * real `saveCell` and its content and spec mutations, the ledger is the
 * real session store read through the real `SessionChangesSheet`, and the
 * transcript's durable half is the real `persistEvent`. What is fake is the
 * database — an in-memory `cells` table (plus the `agent_sessions` and
 * `agent_messages` the panel writes through) behind the calls these modules
 * make — and the model: the provider adapter is the scripted one the loop's
 * own test introduced (`src/lib/agent/loop.test.tsx`), so there is no network
 * and no key beyond the string that unlocks the send.
 *
 * That test already drove provider → tool → result → provider under Node.
 * What it could not see is the PANEL: whether a person who types a sentence
 * into the composer gets the turn, the tool row and the result on screen,
 * whether the write is attributed where a reviewer reads attribution, and
 * whether closing the session loses the conversation. That is what this
 * file is for, and it is the per-flow exit condition the
 * large-component-splits decision names for `AgentPanel.tsx`.
 *
 * THE REOPEN IS A READ, NOT A MEMORY. Closing the session only clears what
 * is open; the transcript lives on in the loop's module-level run map, and
 * `hydrateAgentTranscript` early-exits on a run that still has events. So
 * between the close and the reopen this slice forgets the in-process run
 * (`forgetAgentRun`, the loop's seam for exactly this), and the reopen has to
 * hydrate from the `agent_messages` rows the run wrote as it went — which is
 * what a session opened in another browser does. What those rows carry is the
 * conversation: the person's message, the narrations, the answer, and one flat
 * row per tool call with the tool's NAME. What they do not carry is the tool
 * row's disclosure — `persistable()` strips a tool event's `args` and `result`
 * before persisting, so a rehydrated row has nothing to expand and the tool's
 * own result sentence is not on screen. The assertions after the reopen say
 * exactly that, in both directions.
 *
 * THE GATES ARE SOMEONE ELSE'S. The `SupabaseProvider` stub hand-asserts
 * `canAgent`, `canAgentWrite` and `isSampleTrial`, and the viewport probe
 * answers desktop. They are load-bearing — the roster the loop serves and the
 * panel's own affordances are derived from them — so what this slice proves is
 * the FLOW, given a session the provider admits to writing on a desktop shell.
 * That those answers are themselves right is held elsewhere: the provider's
 * derivation and its published key set in
 * `src/contexts/supabaseProviderPublishedSurface.test.tsx`, the tier line the
 * panel shows in `src/components/editor/agentTierLine.test.tsx`, the trial
 * roster in `src/lib/agent/tools/sampleTrial.test.ts`, and the view-only
 * mobile roster in `src/lib/agent/tools/mobileRoster.test.ts`.
 *
 * WHAT A WRONG READ-BACK MEANS HERE. Three of them, each asserted rather
 * than assumed: a write the panel reported that did not land in the row; an
 * entry on the ledger without the session's attribution; a transcript that
 * does not come back from the persisted rows. Two of them are encoded as red
 * cases below — the fake drops a column the write names, and the live tool
 * context hands the session out unattributed — and each has been watched fail
 * the assertions the green case makes. The fake is honest about what it cannot
 * see: a grant or a policy. `check:seed-load` asks the real database those
 * questions for every column this flow writes, and the cell-edit slice's
 * PostgREST form asks them of the same two writes this one drives.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { inMemoryDatabase, type InMemoryDatabase, type Row } from '@/test/inMemoryDatabase'
import type { ChatInput, ChatResult } from '@/lib/agent/providers/provider'
import type { ToolSession } from '@/lib/agent/tools/definition'

/** The row before the agent touches it: every column set, so a revert that restores some of them is caught. */
const FIXTURE: Row = {
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

/** The lane the cell sits on — the content write reads it for its length budget. */
const LANE: Row = { id: 'lane-1', name: 'Dispatch', lane_role: 'frontstage' }

/**
 * The tables this flow touches. `agent_sessions` and `agent_messages` are
 * seeded EMPTY because the panel writes through to them and the reopen reads
 * the transcript back out of `agent_messages` — the fake holds only the tables
 * a test names, so a write to an unnamed one would vanish.
 */
const SEED = (): Record<string, Row[]> => ({
  cells: [FIXTURE],
  lanes: [LANE],
  agent_sessions: [],
  agent_messages: [],
})

/** What the agent writes: one field on each half of the cell, so both write paths run. */
const NEW_SUMMARY = 'Books a crew and texts the slot'
const NEW_FUNCTION = 'Confirm the job and the crew'

/** The scripted provider, the shape the loop's own test scripts: answers each round from the queue. */
const provider = vi.hoisted(() => ({ turns: [] as ChatResult[] }))

vi.mock('@/lib/agent/providers/anthropic', () => ({
  anthropicAdapter: {
    id: 'anthropic',
    chat: async (_input: ChatInput): Promise<ChatResult> =>
      provider.turns.shift() ?? { parts: [], stopReason: 'end' },
  },
}))

/** The database behind this run: the in-memory tables, fresh per case. */
const backend = vi.hoisted(() => ({ current: null as null | InMemoryDatabase }))

// The one seam that is not this flow's: the Supabase provider, mocked the way
// the cell-edit slice mocks it. A signed-in author whose session may write —
// which is what `canAgentWrite` buys the loop — with no trial banner.
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: backend.current!.client,
    configured: true,
    canWrite: true,
    canAgent: true,
    canAgentWrite: true,
    isSampleTrial: false,
  }),
}))
// jsdom has no matchMedia; the shell under test is the desktop one, and the
// mobile roster would take every write tool off the session.
vi.mock('@/hooks/useMobileShell', () => ({ isMobileViewport: () => false }))

import { AgentPanel } from '@/components/editor/AgentPanel'
import { SessionChangesSheet } from '@/components/editor/SessionChangesSheet'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { forgetAgentRun } from '@/lib/agent/loop'
import { agentSessionsSnapshot, deleteAgentSession } from '@/lib/agent/sessions'
import { setOpenAgentSession } from '@/lib/agent/panelState'
import { saveAgentSettings } from '@/lib/agent/settings'
import { clearSession, sessionSnapshot } from '@/lib/authoringSession'

/** A scripted tool call, in the provider's part shape. */
const call = (id: string, name: string, args: Record<string, unknown>) =>
  ({ type: 'tool_call', id, name, args }) as const

/**
 * The turn the model takes: read the cell, then edit it, then answer. Two
 * rounds of tool use with prose on each, so the transcript holds a row per
 * call rather than one folded "N steps" block — the folding starts at three
 * consecutive step rows and this flow is the shape a person actually watches.
 */
function scriptTheTurn() {
  provider.turns = [
    {
      parts: [
        { type: 'text', text: 'Let me read the cell first.' },
        call('r1', 'get_cell', { cell_id: 'cell-1' }),
      ],
      stopReason: 'tool_use',
    },
    {
      parts: [
        { type: 'text', text: 'Now the edit.' },
        call('w1', 'update_cell', {
          cell_id: 'cell-1',
          summary: NEW_SUMMARY,
          function: NEW_FUNCTION,
        }),
      ],
      stopReason: 'tool_use',
    },
    { parts: [{ type: 'text', text: 'Done — summary and function both read better now.' }], stopReason: 'end' },
  ]
}

/**
 * The modules a case drives the surface through. The cases below use the ones
 * imported above; the attribution red imports its own module graph (it mocks a
 * module this graph already bound), so the helpers take the surface rather
 * than closing over the imports.
 */
type Surface = {
  AgentPanel: typeof AgentPanel
  SessionChangesSheet: typeof SessionChangesSheet
  PathSelectionProvider: typeof PathSelectionProvider
  agentSessionsSnapshot: typeof agentSessionsSnapshot
}

const liveSurface: Surface = {
  AgentPanel,
  SessionChangesSheet,
  PathSelectionProvider,
  agentSessionsSnapshot,
}

/** The panel and the change sheet, the way the editor shell mounts them. */
function renderSurface(surface: Surface = liveSurface) {
  const { AgentPanel: Panel, SessionChangesSheet: Sheet, PathSelectionProvider: Paths } = surface
  return render(
    <Paths>
      <Panel />
      <Sheet />
    </Paths>,
  )
}

/** The row as the database holds it now, through the same client the flow wrote with. */
async function readBack(): Promise<Row | null> {
  const { data, error } = await backend.current!.client
    .from('cells')
    .select('*')
    .eq('id', 'cell-1')
    .maybeSingle()
  if (error) throw error
  return (data as unknown as Row) ?? null
}

/** The row after the agent's write: the two named fields, nothing else moved. */
const edited = (): Row => ({ ...FIXTURE, summary: NEW_SUMMARY, function: NEW_FUNCTION })

/**
 * The transcript, scoped. The first message also NAMES the session, so the
 * sentence a person typed is on screen twice — in the conversation and in the
 * header — and an assertion about the transcript has to say which it means.
 */
const transcript = () => within(screen.getByRole('region', { name: 'Messages' }))

/** The tool row for a call, by the tool's name — the mono face the transcript renders. */
function toolRow(name: string): HTMLElement {
  const face = transcript().getByText(name)
  const row = face.closest('button')
  if (!row) throw new Error(`the ${name} row is not expandable — it carries no payload`)
  return row
}

/** Open a tool row and return the text of what it discloses (arguments and result). */
function discloseToolRow(name: string): string {
  const row = toolRow(name)
  fireEvent.click(row)
  const disclosed = row.parentElement?.textContent ?? ''
  return disclosed
}

/**
 * Open the panel, start a session, send one message, and wait for the run to
 * finish — everything a person does, through the panel's own controls.
 */
async function openSessionAndSend(text: string, surface: Surface = liveSurface): Promise<string> {
  renderSurface(surface)
  fireEvent.click(screen.getByRole('button', { name: 'New session' }))
  const composer = screen.getByRole('textbox', { name: 'Message the agent' })
  fireEvent.change(composer, { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  // The final answer on screen is the run's own signal that it is over.
  await vi.waitFor(() =>
    expect(transcript().getByText('Done — summary and function both read better now.')).toBeTruthy(),
  )
  const session = surface.agentSessionsSnapshot()[0]
  if (!session) throw new Error('the panel created no session')
  return session.id
}

beforeEach(() => {
  provider.turns = []
  clearSession()
  setOpenAgentSession(null)
  // The sessions store is a module store with a localStorage layer, so a
  // case starts from no sessions rather than from the previous case's.
  agentSessionsSnapshot().forEach((session) => deleteAgentSession(session.id))
  backend.current = inMemoryDatabase(SEED())
  // The one key the send gate reads. It never leaves this process: the
  // provider adapter above is the scripted one.
  saveAgentSettings({ provider: 'anthropic', keys: { anthropic: 'test-key' } })
})

afterEach(() => {
  cleanup()
  clearSession()
  setOpenAgentSession(null)
  agentSessionsSnapshot().forEach((session) => deleteAgentSession(session.id))
})

describe('an agent session runs from the panel: a read, a write, the ledger, a revert, and a reopen', () => {
  it('renders the turn and its tool rows, lands the write attributed, reverts it, and keeps the transcript across a reopen', async () => {
    scriptTheTurn()
    const sessionId = await openSessionAndSend('Give cell-1 a clearer summary and function.')

    // THE PANEL RENDERS THE TURN. The person's own message, the narration
    // between the calls, and the answer — in the panel, not in a store peek.
    expect(transcript().getByText('Give cell-1 a clearer summary and function.')).toBeTruthy()
    expect(transcript().getByText('Let me read the cell first.')).toBeTruthy()
    expect(transcript().getByText('Now the edit.')).toBeTruthy()

    // THE PANEL RENDERS EACH TOOL CALL AND ITS RESULT. Opening a row shows
    // what the agent sent and what came back — the read's own rendering of
    // the row as it stood, and the write's own sentence.
    const read = discloseToolRow('get_cell')
    expect(read).toContain('cell-1')
    expect(read).toContain('summary: Books a crew')
    const written = discloseToolRow('update_cell')
    expect(written).toContain(NEW_SUMMARY)
    expect(written).toContain('Cell updated (text and spec — two entries in the change list).')

    // THE WRITE LANDED, in the row, both halves, nothing else moved.
    expect(await readBack()).toEqual(edited())

    // THE LEDGER HOLDS IT, one entry per write path, each attributed to
    // THIS session and each carrying its inverse.
    const entries = sessionSnapshot()
    expect(entries.map((entry) => entry.fn)).toEqual(['update_cell_content', 'update_cell_spec'])
    expect(entries.every((entry) => entry.author === 'agent')).toBe(true)
    expect(entries.every((entry) => entry.agentSessionId === sessionId)).toBe(true)
    expect(entries.every((entry) => entry.revert)).toBe(true)

    // …and the sheet shows the attribution where a reviewer reads it: one ✦
    // per row, from the real change sheet over the real store.
    fireEvent.click(screen.getByRole('button', { name: 'Review 2 changes' }))
    expect(screen.getAllByLabelText('Made by the agent')).toHaveLength(2)

    // THE PERSON TAKES BOTH BACK, the way they do: Revert on each row.
    for (const remaining of [1, 0]) {
      const [revert] = screen.getAllByRole('button', { name: 'Revert this change' })
      fireEvent.click(revert!)
      await vi.waitFor(() => expect(sessionSnapshot()).toHaveLength(remaining))
    }

    // The row reads back as it was, column for column.
    expect(await readBack()).toEqual(FIXTURE)
    // The content write synced the cell's placements each time the text was
    // written: once on the agent's edit, once on the revert.
    expect(backend.current!.rpcs.map((issued) => issued.fn)).toEqual([
      'sync_cell_touchpoints',
      'sync_cell_touchpoints',
    ])

    // THE DURABLE HALF WROTE THROUGH AS IT WENT: one `agent_messages` row per
    // transcript event, in the order they happened.
    expect(backend.current!.tables.agent_messages!.map((row) => row.kind)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
      'tool',
      'assistant',
    ])

    // THE TRANSCRIPT READS BACK OUT OF THOSE ROWS. Back to the session list —
    // the conversation is off screen — then FORGET the in-process run, so the
    // reopen has nothing in memory to re-render and has to hydrate from
    // `agent_messages`, the way a session opened in another browser does.
    fireEvent.click(screen.getByRole('button', { name: 'Back to sessions' }))
    expect(screen.queryByText('Done — summary and function both read better now.')).toBeNull()
    forgetAgentRun(sessionId)
    fireEvent.click(screen.getByText(agentSessionsSnapshot()[0]!.title))
    // The hydrate is a load; the answer's return is its signal.
    await vi.waitFor(() =>
      expect(
        transcript().getByText('Done — summary and function both read better now.'),
      ).toBeTruthy(),
    )
    // What the persisted rows carry: the person's message, both narrations,
    // the answer, and a row per tool call under the tool's own name.
    expect(transcript().getByText('Give cell-1 a clearer summary and function.')).toBeTruthy()
    expect(transcript().getByText('Let me read the cell first.')).toBeTruthy()
    expect(transcript().getByText('Now the edit.')).toBeTruthy()
    expect(transcript().getByText('get_cell')).toBeTruthy()
    expect(transcript().getByText('update_cell')).toBeTruthy()
    // What they do NOT carry, asserted so the sentence above stays true:
    // `persistable()` strips a tool event's arguments and result, so the
    // rehydrated row is flat — nothing to expand, and the tool's own result
    // sentence is not on screen.
    expect(transcript().getByText('update_cell').closest('button')).toBeNull()
    expect(
      transcript().queryByText('Cell updated (text and spec — two entries in the change list).'),
    ).toBeNull()
    expect(transcript().queryByText(`summary: ${FIXTURE.summary}`)).toBeNull()
  })

  it('goes red on a wrong read-back: a column the database does not land, reported as written', async () => {
    // The instrument, proved against a real shape of defect. The grant forgot
    // one column, so the write lands everything else; the tool still reports
    // success and the panel still shows the row green — and the read-back the
    // case above makes no longer holds, which is the whole point of making it.
    backend.current = inMemoryDatabase(SEED(), { dropOnWrite: ['summary'] })
    scriptTheTurn()
    await openSessionAndSend('Give cell-1 a clearer summary and function.')

    expect(discloseToolRow('update_cell')).toContain(
      'Cell updated (text and spec — two entries in the change list).',
    )
    const row = await readBack()
    expect(row).not.toEqual(edited())
    expect(row).toMatchObject({ summary: FIXTURE.summary, function: NEW_FUNCTION })
  })
})

/**
 * THE SECOND RED: the same flow with the session's attribution stripped.
 *
 * The defect is injected at a seam the flow actually routes through.
 * `src/lib/agent/tools/liveContext.ts` is the one module that knows the
 * ledger's attribution by name — every write tool runs its work inside
 * `liveSession(id).attributed`, which is what stamps the entry with `agent`
 * and with this session's id. Hand the tools a session that just runs the
 * work, the way a refactor that "simplified" that wrapper would, and the
 * write still lands and the panel still reports it: what goes is the
 * attribution a reviewer reads, and the ✦ the change sheet draws from it.
 *
 * Mocking that module needs a module graph that has not bound it yet — the
 * panel, the loop and the registry above are already bound to the real one —
 * so this case resets the registry and imports its own surface. The
 * localStorage-backed stores (sessions, settings) are read at module init, so
 * the fresh graph starts from the same state the `beforeEach` above left.
 */
describe('goes red on a stripped attribution: the write lands, the ledger does not wear the session', () => {
  it('leaves the ledger unattributed and the change sheet without a ✦', async () => {
    vi.resetModules()
    vi.doMock('@/lib/agent/tools/liveContext', async () => {
      const actual = await vi.importActual<typeof import('@/lib/agent/tools/liveContext')>(
        '@/lib/agent/tools/liveContext',
      )
      return {
        ...actual,
        liveSession: (id: string): ToolSession => ({ id, attributed: (work) => work() }),
      }
    })
    const [panel, sheet, paths, sessions, ledger] = await Promise.all([
      import('@/components/editor/AgentPanel'),
      import('@/components/editor/SessionChangesSheet'),
      import('@/contexts/PathSelectionContext'),
      import('@/lib/agent/sessions'),
      import('@/lib/authoringSession'),
    ])
    const surface: Surface = {
      AgentPanel: panel.AgentPanel,
      SessionChangesSheet: sheet.SessionChangesSheet,
      PathSelectionProvider: paths.PathSelectionProvider,
      agentSessionsSnapshot: sessions.agentSessionsSnapshot,
    }

    scriptTheTurn()
    const sessionId = await openSessionAndSend(
      'Give cell-1 a clearer summary and function.',
      surface,
    )

    // The write landed and the panel says so — the defect is invisible here.
    expect(discloseToolRow('update_cell')).toContain(
      'Cell updated (text and spec — two entries in the change list).',
    )
    expect(await readBack()).toEqual(edited())

    // And the ledger assertions the green case makes all fail: the entries are
    // there, wearing the USER's authorship and no session.
    const entries = ledger.sessionSnapshot()
    expect(entries.map((entry) => entry.fn)).toEqual(['update_cell_content', 'update_cell_spec'])
    expect(entries.every((entry) => entry.author === 'agent')).toBe(false)
    expect(entries.every((entry) => entry.agentSessionId === sessionId)).toBe(false)

    // …and the sheet draws no ✦, which is where a reviewer would have missed it.
    fireEvent.click(screen.getByRole('button', { name: 'Review 2 changes' }))
    expect(screen.queryAllByLabelText('Made by the agent')).toHaveLength(0)

    // The fresh graph's ledger is not the one the outer teardown clears.
    ledger.clearSession()
  })
})
