// @vitest-environment jsdom
/**
 * THE COMPOSER'S SKILL LOOKUP, on screen.
 *
 * The rule itself — which slashes open a lookup, and which are text — is a
 * table in `src/lib/agent/skills.test.ts`, where it belongs: it is a pure
 * function over the draft. What cannot be asserted there is what the panel
 * does with it, and that is the half a reader meets: whether the menu opens
 * on a token typed mid-sentence, and whether picking from it keeps the
 * sentence the token was sitting in.
 *
 * Beside it: the notice a message gets when it NAMES a skill and carries
 * none. The sentence the model is told lives in the loop's own test; what is
 * asserted here is the choice the reader is given, and that neither branch is
 * taken for them.
 *
 * The panel is the real `AgentPanel` over the real sessions store. What is
 * faked is the Supabase provider (a signed-in author, no trial), the viewport
 * probe, and the provider adapter — the same seams the agent-session slice
 * fakes and for the same reasons. There is no database and no network.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatInput, ChatResult } from '@/lib/agent/providers/provider'

/** The scripted model: one answer per send, and it keeps what it was sent. */
const provider = vi.hoisted(() => ({ inputs: [] as ChatInput[] }))

vi.mock('@/lib/agent/providers/anthropic', () => ({
  anthropicAdapter: {
    id: 'anthropic',
    chat: async (input: ChatInput): Promise<ChatResult> => {
      provider.inputs.push(input)
      return { parts: [{ type: 'text', text: 'Noted.' }], stopReason: 'end' }
    },
  },
}))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: {},
    configured: true,
    canWrite: true,
    canAgent: false,
    canAgentWrite: true,
    isSampleTrial: false,
  }),
}))
vi.mock('@/hooks/useMobileShell', () => ({ isMobileViewport: () => false }))

import { AgentPanel } from '@/components/editor/AgentPanel'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import {
  agentSessionsSnapshot,
  closeAgentSession,
  deleteAgentSession,
} from '@/lib/agent/sessions'
import { saveAgentSettings } from '@/lib/agent/settings'

/** The panel, opened on a fresh session with the composer ready to type in. */
function openComposer(): HTMLElement {
  render(
    <PathSelectionProvider>
      <AgentPanel />
    </PathSelectionProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'New session' }))
  return screen.getByRole('textbox', { name: 'Message the agent' })
}

const type = (composer: HTMLElement, value: string) =>
  fireEvent.change(composer, { target: { value } })

/**
 * The menu's row for a skill — scoped to the popover, because the badge on
 * an already-picked skill carries the same label and a bare text query would
 * find whichever the DOM happened to hold first.
 */
const menuOption = (label: string) => {
  const menu = screen.queryByLabelText('Agent skills')
  return menu ? within(menu).queryByText(label) : null
}

/** Pick a skill through the menu, the way a reader does. */
const pick = (composer: HTMLElement, typed: string, label: string) => {
  type(composer, typed)
  fireEvent.click(menuOption(label)!)
}

beforeAll(() => {
  // cmdk measures its list, and the menu scrolls the highlight into view —
  // neither exists in jsdom. Same two stubs the Jump to… palette's test makes.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  provider.inputs = []
  closeAgentSession()
  agentSessionsSnapshot().forEach((session) => deleteAgentSession(session.id))
  // The composer is disabled without a key, and a disabled field types nothing.
  saveAgentSettings({ provider: 'anthropic', keys: { anthropic: 'test-key' } })
})

afterEach(() => {
  cleanup()
  closeAgentSession()
  agentSessionsSnapshot().forEach((session) => deleteAgentSession(session.id))
})

describe('the composer opens a skill lookup wherever a slash opens a word', () => {
  it('opens on a token typed mid-sentence, and picking keeps the prose around it', () => {
    const composer = openComposer()
    pick(composer, 'Hey can u /sb:aud', '/sb:audit')
    // The badge stands where the token was; the words before it are still
    // the reader's message, and they are what sends.
    expect((composer as HTMLTextAreaElement).value).toBe('Hey can u ')
    expect(screen.getByRole('button', { name: 'Remove /sb:audit' })).toBeTruthy()
  })

  it('finds a skill by the segment after its namespace', () => {
    const composer = openComposer()
    type(composer, 'first /aud')
    expect(menuOption('/sb:audit')).toBeTruthy()
  })

  it('stays shut on a slash that opens no word', () => {
    const composer = openComposer()
    type(composer, 'look at src/lib')
    expect(menuOption('/sb:audit')).toBeNull()
    type(composer, 'do this and/or that')
    expect(menuOption('/sb:audit')).toBeNull()
  })

  it('closes on the space after the token', () => {
    const composer = openComposer()
    type(composer, 'Hey can u /aud')
    expect(menuOption('/sb:audit')).toBeTruthy()
    type(composer, 'Hey can u /aud ')
    expect(menuOption('/sb:audit')).toBeNull()
  })
})

describe('a message that names a skill it does not carry', () => {
  const NAMED = 'Hey can u /sb:audit the goal setting scenario'

  it('asks once, and sends nothing until the reader chooses', async () => {
    const composer = openComposer()
    type(composer, NAMED)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('button', { name: 'Run /sb:audit' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send as text' })).toBeTruthy()
    // Neither branch taken for them: nothing has gone to the model.
    expect(provider.inputs).toEqual([])
  })

  it('runs the skill when asked to, on the prose minus the token', async () => {
    const composer = openComposer()
    type(composer, NAMED)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run /sb:audit' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    const sent = provider.inputs[0]!
    expect(sent.system).toContain('--- active skill: /sb:audit')
    expect(JSON.stringify(sent.messages)).toContain(
      'Hey can u the goal setting scenario',
    )
  })

  it('sends the prose unchanged when asked to, and says the skill did not run', async () => {
    const composer = openComposer()
    type(composer, NAMED)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send as text' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    const sent = provider.inputs[0]!
    expect(JSON.stringify(sent.messages)).toContain(NAMED)
    expect(sent.system).toContain('did NOT run')
    expect(sent.system).not.toContain('--- active skill')
  })

  it('offers the canonical skill for a bare alias instead of running it', () => {
    const composer = openComposer()
    type(composer, 'then /audit the intake')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText(/closest match is \/sb:audit/)).toBeTruthy()
    expect(provider.inputs).toEqual([])
  })

  it('leaves a message carrying a skill alone', async () => {
    const composer = openComposer()
    pick(composer, 'Hey can u /sb:aud', '/sb:audit')
    type(composer, 'Hey can u check the goal setting scenario')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    expect(screen.queryByRole('button', { name: 'Send as text' })).toBeNull()
  })
})

describe('one message carrying several skills', () => {
  it('holds a badge per skill in pick order, each dropped on its own', () => {
    const composer = openComposer()
    pick(composer, 'build this from my notes /sb:map', '/sb:map')
    pick(composer, 'build this from my notes then check it /sb:aud', '/sb:audit')
    expect(
      screen.getAllByRole('button', { name: /^Remove \/sb:/ }).map(
        (button) => button.getAttribute('aria-label'),
      ),
    ).toEqual(['Remove /sb:map', 'Remove /sb:audit'])

    fireEvent.click(screen.getByRole('button', { name: 'Remove /sb:map' }))
    expect(screen.queryByRole('button', { name: 'Remove /sb:map' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove /sb:audit' })).toBeTruthy()
    // The prose is nobody's collateral.
    expect((composer as HTMLTextAreaElement).value).toBe(
      'build this from my notes then check it ',
    )
  })

  it('counts a skill picked twice once', () => {
    const composer = openComposer()
    pick(composer, '/sb:map', '/sb:map')
    pick(composer, 'and /sb:map', '/sb:map')
    expect(screen.getAllByRole('button', { name: 'Remove /sb:map' })).toHaveLength(1)
  })

  it('sends every picked skill, and an instruction when the prose is empty', async () => {
    const composer = openComposer()
    pick(composer, '/sb:map', '/sb:map')
    pick(composer, '/sb:aud', '/sb:audit')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    const sent = provider.inputs[0]!
    expect(sent.system).toContain('--- active skill: /sb:map')
    expect(sent.system).toContain('--- active skill: /sb:audit')
    expect(JSON.stringify(sent.messages)).toContain(
      'Run /sb:map, then /sb:audit — each from the top of its flow, in that order.',
    )
  })
})
