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
 * Beside it: the notice a NEAR MISS gets — `/audit`, which names no skill and
 * runs nothing. The sentence the model is told lives in the loop's own test;
 * what is asserted here is the choice the reader is given, and that neither
 * branch is taken for them.
 *
 * The field and the mirrored copy of the draft behind it are one module and
 * are asserted through its interface, in `agentComposerField.test.tsx`: the
 * metrics both copies wear, the one positioned box they measure, the scroll
 * sync, the transparency and the IME stand-down. What stays here is the
 * wiring — that the panel hands that module the tokens it read out of the
 * draft, so a resolved token is coloured on the surface a reader is typing on.
 *
 * The panel is the real `AgentPanel` over the real sessions store. What is
 * faked is the Supabase provider (a signed-in author, no trial), the viewport
 * probe, and the provider adapter — the same seams the agent-session slice
 * fakes and for the same reasons. There is no database and no network.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { wholeSystem } from '@/lib/agent/providers/provider'
import type { ChatInput, ChatResult } from '@/lib/agent/providers/provider'

/** The scripted model: one answer per send, and it keeps what it was sent. */
const provider = vi.hoisted(() => ({
  inputs: [] as ChatInput[],
  /** Set to park the answer so a run can be caught mid-flight. */
  hold: null as Promise<void> | null,
}))

vi.mock('@/lib/agent/providers/anthropic', () => ({
  anthropicAdapter: {
    id: 'anthropic',
    chat: async (input: ChatInput): Promise<ChatResult> => {
      provider.inputs.push(input)
      if (provider.hold) await provider.hold
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
 * The menu's row for a skill — scoped to the popover, because the token in
 * the field and the mirror drawing it behind carry the same label, and an
 * unscoped text query would find whichever the DOM happened to hold first,
 * passing on the wrong node.
 */
const menuOption = (label: string) => {
  const menu = screen.queryByLabelText('Agent skills')
  return menu ? within(menu).queryByText(label) : null
}

/**
 * The mirrored copy of the draft, drawn behind the field. It is `aria-hidden`,
 * so it is queried the one way a hidden node can be: by the slot it declares.
 */
const composerMirror = () =>
  document.querySelector<HTMLElement>('[data-slot="composer-mirror"]')

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
  provider.hold = null
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
  it('opens on a token typed mid-sentence, and accepting completes it in place', () => {
    const composer = openComposer()
    pick(composer, 'Hey can u /sb:aud', '/sb:audit')
    // The token gains its ending where it sits. It used to be lifted out of
    // the prose into a badge above the field, which put the reader's word at
    // the front of their own message.
    expect((composer as HTMLTextAreaElement).value).toBe('Hey can u /sb:audit ')
  })

  it('leaves the caret at the end of the completed draft', () => {
    // No caret write goes with the completion, and this is the property that
    // makes that safe: a lookup's span reaches the end of the draft, so the
    // end is where the reader was already typing. The field is focused and
    // its caret set BEFORE the pick on purpose — that is the path React's own
    // selection restoration runs on, and a restore to the pre-completion
    // offset would leave the caret inside the word it just finished.
    const composer = openComposer() as HTMLTextAreaElement
    composer.focus()
    composer.setSelectionRange(17, 17)
    pick(composer, 'Hey can u /sb:aud', '/sb:audit')
    expect(composer.selectionStart).toBe(composer.value.length)
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

describe('a token that nearly names a skill', () => {
  const NEAR = 'then /audit the intake'

  it('asks once, and sends nothing until the reader chooses', () => {
    const composer = openComposer()
    type(composer, NEAR)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText(/closest match is \/sb:audit/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Run /sb:audit' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send as text' })).toBeTruthy()
    // Neither branch taken for them: nothing has gone to the model.
    expect(provider.inputs).toEqual([])
  })

  it('completes the token in place when the offer is taken', async () => {
    const composer = openComposer()
    type(composer, NEAR)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run /sb:audit' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    const sent = provider.inputs[0]!
    expect(wholeSystem(sent)).toContain('--- active skill: /sb:audit')
    // The official name stands where the reader's near miss stood, and the
    // sentence either side of it is untouched — accepting an offer moves a
    // word no more than accepting from the menu does.
    expect(JSON.stringify(sent.messages)).toContain('then /sb:audit the intake')
  })

  it('sends the prose unchanged when asked to, and says nothing ran', async () => {
    const composer = openComposer()
    type(composer, NEAR)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send as text' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    const sent = provider.inputs[0]!
    expect(JSON.stringify(sent.messages)).toContain(NEAR)
    expect(wholeSystem(sent)).toContain('is NOT a skill name')
    expect(wholeSystem(sent)).not.toContain('--- active skill')
  })

  it('names both misses, and asks again for the second after the first is taken', async () => {
    // The silence this notice exists to close, reopened one token to the
    // right: a message with two near misses asked about `/audit`, completed
    // it, and sent with `/map` still naming nothing. Accepting goes back
    // through the same check, so the second one asks in its turn.
    //
    // The sequence itself is pinned as a pure assertion in
    // `src/lib/agent/sendDecision.test.ts`, where a returned question can be read
    // without a click. What this adds is the wiring: the panel renders the
    // question it got back rather than sending on it.
    const composer = openComposer()
    type(composer, 'check /audit then /map this')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText(/closest matches are \/sb:audit and \/sb:map/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Run /sb:audit' }))
    // Nothing sent yet: the second miss is now the question.
    expect(provider.inputs).toEqual([])
    expect(screen.getByText(/closest match is \/sb:map/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Run /sb:map' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    const sent = provider.inputs[0]!
    expect(JSON.stringify(sent.messages)).toContain(
      'check /sb:audit then /sb:map this',
    )
    // Both skills ran, and nothing was reported as unrun.
    expect(wholeSystem(sent)).toContain('--- active skill: /sb:audit')
    expect(wholeSystem(sent)).toContain('--- active skill: /sb:map')
    expect(wholeSystem(sent)).not.toContain('NOT skill name')
  })

  it('tells the model about every miss when the prose goes as it stands', async () => {
    const composer = openComposer()
    type(composer, 'check /audit then /map this')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send as text' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    const sent = provider.inputs[0]!
    expect(JSON.stringify(sent.messages)).toContain('check /audit then /map this')
    // Both named. One told and the other left out is the same silence with a
    // smaller mouth — the model reads "/map" as a map that ran.
    expect(wholeSystem(sent)).toContain('"/audit" and "/map"')
    expect(wholeSystem(sent)).toContain('/sb:audit and /sb:map')
    expect(wholeSystem(sent)).not.toContain('--- active skill')
  })

  it('asks nothing while a run is in flight, and leaves the draft where it is', async () => {
    // How a reader reached a corrupted draft. The composer's Send button is
    // disabled mid-run but Enter is not, and the question used to be raised
    // before the panel checked whether a send could happen at all: Enter put
    // the notice up during a run, accepting rewrote the field, the send was
    // then dropped on the floor, and the notice stayed on screen holding
    // spans measured against the text that had just moved. The next click
    // completed a token against offsets that no longer pointed at it and
    // `/audit` came back as `/sb:audit dit `. Nothing is decided now until a
    // send is possible, so the draft and the notice cannot disagree.
    let release = () => {}
    provider.hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const composer = openComposer()
    type(composer, 'say hello')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    type(composer, NEAR)
    fireEvent.keyDown(composer, { key: 'Enter' })
    expect(screen.queryByText(/closest match is \/sb:audit/)).toBeNull()
    expect((composer as HTMLTextAreaElement).value).toBe(NEAR)
    expect(provider.inputs.length).toBe(1)
    release()
    // Once the run is done the same press asks, and the draft is still the
    // one the reader typed — untouched by the press that could not send it.
    await vi.waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull(),
    )
    fireEvent.keyDown(composer, { key: 'Enter' })
    expect(screen.getByText(/closest match is \/sb:audit/)).toBeTruthy()
    expect((composer as HTMLTextAreaElement).value).toBe(NEAR)
  })

  it('drops the question when the reader edits the draft it was about', async () => {
    // The question was about the draft as it stood, and its misses carry
    // offsets into that exact string. Left standing across an edit, the next
    // press of Send would declare a miss the sentence may no longer hold —
    // and an accept would rewrite a span that has moved.
    const composer = openComposer()
    type(composer, NEAR)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('button', { name: 'Send as text' })).toBeTruthy()
    type(composer, 'then /audit the intake please')
    expect(screen.queryByRole('button', { name: 'Send as text' })).toBeNull()
    // And the next press asks again rather than sending the edited prose on
    // an answer given about an older draft.
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText(/closest match is \/sb:audit/)).toBeTruthy()
    expect(provider.inputs).toEqual([])
  })

  it('drops the question when a pick from the menu rewrites the draft', () => {
    // A notice and the menu can be on screen together: this draft has a miss
    // to answer for AND a token at its tail to complete. Completing the tail
    // moves the text under the question, so the question goes with it — a
    // stale miss answered after a pick rewrites the wrong span.
    const composer = openComposer()
    type(composer, 'then /audit the /sb:ma')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('button', { name: 'Send as text' })).toBeTruthy()
    fireEvent.click(menuOption('/sb:map')!)
    expect((composer as HTMLTextAreaElement).value).toBe(
      'then /audit the /sb:map ',
    )
    expect(screen.queryByRole('button', { name: 'Send as text' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText(/closest match is \/sb:audit/)).toBeTruthy()
    expect(provider.inputs).toEqual([])
  })

  it('asks nothing about a token that resolves — it runs', async () => {
    const composer = openComposer()
    type(composer, 'Hey can u /sb:audit the goal setting scenario')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    // Straight through, with the skill loaded. The prompt that used to stand
    // here asked a reader to confirm what the colour in the field already
    // told them.
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    expect(screen.queryByRole('button', { name: 'Send as text' })).toBeNull()
    expect(wholeSystem(provider.inputs[0]!)).toContain('--- active skill: /sb:audit')
  })
})

describe('one message carrying several skills', () => {
  it('colours every token it resolves, wherever each one sits', () => {
    const composer = openComposer()
    type(composer, 'build this from my notes /sb:map then /sb:audit it')
    const drawn = composerMirror()!
    expect(within(drawn).getByText('/sb:map')).toBeTruthy()
    expect(within(drawn).getByText('/sb:audit')).toBeTruthy()
    // And the prose between them is nobody's collateral.
    expect((composer as HTMLTextAreaElement).value).toBe(
      'build this from my notes /sb:map then /sb:audit it',
    )
  })

  it('runs them in the order the sentence puts them in', async () => {
    const composer = openComposer()
    type(composer, 'build this from my notes /sb:map then /sb:audit it')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    const sent = provider.inputs[0]!
    expect(wholeSystem(sent).indexOf('--- active skill: /sb:map')).toBeLessThan(
      wholeSystem(sent).indexOf('--- active skill: /sb:audit'),
    )
    expect(wholeSystem(sent)).toContain('in this order: /sb:map → /sb:audit')
    // The text is what sends, tokens and all — it is what the reader wrote.
    expect(JSON.stringify(sent.messages)).toContain(
      'build this from my notes /sb:map then /sb:audit it',
    )
  })

  it('counts a skill named twice once', async () => {
    const composer = openComposer()
    type(composer, '/sb:map from my notes, then /sb:map the rest')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    // One body, not two: a reader who names a skill twice means it once, and
    // a second copy of a multi-kilobyte SKILL.md buys nothing but prompt.
    expect(
      wholeSystem(provider.inputs[0]!).split('--- active skill: /sb:map'),
    ).toHaveLength(2)
  })

  it('sends an instruction when the tokens are the whole message', async () => {
    const composer = openComposer()
    type(composer, '/sb:map /sb:audit')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await vi.waitFor(() => expect(provider.inputs.length).toBe(1))
    expect(JSON.stringify(provider.inputs[0]!.messages)).toContain(
      'Run /sb:map, then /sb:audit — each from the top of its flow, in that order.',
    )
  })
})

describe("the menu's keyboard behaviour", () => {
  it('walks the matches with the arrows and accepts the highlighted one', () => {
    const composer = openComposer()
    // Every skill matches an empty query, so the list is the four of them in
    // definition order and the second one is reachable in one keystroke.
    type(composer, '/')
    fireEvent.keyDown(composer, { key: 'ArrowDown' })
    fireEvent.keyDown(composer, { key: 'Enter' })
    // Accepted and completed: the menu is shut and the token is in the text.
    expect(menuOption('/sb:slice')).toBeNull()
    expect((composer as HTMLTextAreaElement).value).toBe('/sb:slice ')
  })

  it('takes the item the arrows left on focus, not the first one', () => {
    // The gesture in full: a populated list, the highlight walked two down,
    // and Tab taking THAT row. A Tab handler that reached for the first match
    // instead would pass every other case in this block.
    const composer = openComposer()
    type(composer, '/')
    fireEvent.keyDown(composer, { key: 'ArrowDown' })
    fireEvent.keyDown(composer, { key: 'ArrowDown' })
    fireEvent.keyDown(composer, { key: 'Tab' })
    expect((composer as HTMLTextAreaElement).value).toBe('/sb:audit ')
  })

  it('accepts on Tab, and wraps round the ends with ArrowUp', () => {
    const composer = openComposer()
    type(composer, '/')
    fireEvent.keyDown(composer, { key: 'ArrowUp' })
    fireEvent.keyDown(composer, { key: 'Tab' })
    expect(menuOption('/sb:whatif')).toBeNull()
    expect((composer as HTMLTextAreaElement).value).toBe('/sb:whatif ')
  })

  it('dismisses on Escape without touching a character of the draft', () => {
    const composer = openComposer()
    type(composer, 'Hey can u /sb:aud')
    expect(menuOption('/sb:audit')).toBeTruthy()
    fireEvent.keyDown(composer, { key: 'Escape' })
    expect(menuOption('/sb:audit')).toBeNull()
    // The token is the reader's text until they pick something. Escape used
    // to delete it, with no undo.
    expect((composer as HTMLTextAreaElement).value).toBe('Hey can u /sb:aud')
    // Typing asks again.
    type(composer, 'Hey can u /sb:audi')
    expect(menuOption('/sb:audit')).toBeTruthy()
  })
})
