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
 * Beside it: the colour a resolved token takes where it was typed, and the
 * notice a NEAR MISS gets — `/audit`, which names no skill and runs nothing.
 * The sentence the model is told lives in the loop's own test; what is
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
import { COMPOSER_FIELD_METRICS } from '@/components/editor/agent/ComposerSkillInk'
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
 * the field and the layer drawing it behind carry the same label, and an
 * unscoped text query would find whichever the DOM happened to hold first,
 * passing on the wrong node.
 */
const menuOption = (label: string) => {
  const menu = screen.queryByLabelText('Agent skills')
  return menu ? within(menu).queryByText(label) : null
}

/**
 * The layer that draws the prose behind the field. It is `aria-hidden`, so it
 * is queried the one way a hidden node can be: by the slot it declares.
 */
const skillInk = () =>
  document.querySelector<HTMLElement>('[data-slot="composer-skill-ink"]')

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

describe('a token that names a skill is coloured where it sits', () => {
  it('draws the whole draft behind the field, with the token in role ink', () => {
    const composer = openComposer()
    type(composer, 'Hey can u /sb:audit the intake')
    const ink = skillInk()!
    // The layer carries the SAME string, so the caret and the colour agree.
    // The trailing newline is the one the block would otherwise collapse.
    expect(ink.textContent).toBe('Hey can u /sb:audit the intake\n')
    expect(within(ink).getByText('/sb:audit').className).toContain(
      'text-text-primary',
    )
    // And the field hands the drawing over while the layer is doing it.
    expect(composer.className).toContain('text-transparent')
  })

  it('wears the same metrics as the field, down to the last one', () => {
    // The shimmer guard. Two copies of one string wrap alike only while they
    // agree on every property that decides a line break, so the agreement is
    // one string and this asserts both of them still wear it.
    const composer = openComposer()
    type(composer, 'Hey can u /sb:audit the intake')
    const ink = skillInk()!
    for (const metric of COMPOSER_FIELD_METRICS.split(' ')) {
      expect(composer.className.split(' '), metric).toContain(metric)
      expect(ink.className.split(' '), metric).toContain(metric)
    }
  })

  it('shares one positioned box with the field, and not the whole group', () => {
    // The containing-block guard. `absolute inset-0` measures the nearest
    // POSITIONED ancestor, and the layer only wraps like the field while that
    // ancestor is sized by the field. Against InputGroup the two coincided
    // by accident — the field was its only child, in the slot the badge addon
    // had just left — and an addon put back there narrows the field through
    // the group's own `has-[>[data-align=inline-start]]` rules while leaving
    // the layer full width: every line from the first wrap down breaks
    // elsewhere, which the shared metrics string cannot see or prevent.
    const composer = openComposer()
    type(composer, 'Hey can u /sb:audit the intake')
    const box = skillInk()!.parentElement!
    expect(box.className.split(' ')).toContain('relative')
    // The field is inside that same box, and the box is not the group.
    expect(box.contains(composer)).toBe(true)
    expect(box.dataset.slot).toBeUndefined()
  })

  it('follows the field when a long message scrolls', () => {
    const composer = openComposer()
    type(composer, 'Hey can u /sb:audit the intake')
    composer.scrollTop = 40
    fireEvent.scroll(composer)
    expect(skillInk()!.scrollTop).toBe(40)
  })

  it('leaves the field drawing its own text when no token resolves', () => {
    const composer = openComposer()
    // A bare alias resolves nothing, so nothing is coloured and nothing runs.
    type(composer, 'then /audit the intake')
    expect(skillInk()).toBeNull()
    expect(composer.className).not.toContain('text-transparent')
  })

  it('stands down while an IME is composing', () => {
    const composer = openComposer()
    type(composer, 'Hey can u /sb:audit')
    expect(skillInk()).toBeTruthy()
    // A preedit string lives in the field, and transparent text would make
    // it invisible for as long as it is being composed.
    fireEvent.compositionStart(composer)
    expect(skillInk()).toBeNull()
    expect(composer.className).not.toContain('text-transparent')
    fireEvent.compositionEnd(composer)
    expect(skillInk()).toBeTruthy()
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
    expect(sent.system).toContain('--- active skill: /sb:audit')
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
    expect(sent.system).toContain('is NOT a skill name')
    expect(sent.system).not.toContain('--- active skill')
  })

  it('names both misses, and asks again for the second after the first is taken', async () => {
    // The silence this notice exists to close, reopened one token to the
    // right: a message with two near misses asked about `/audit`, completed
    // it, and sent with `/map` still naming nothing. Accepting goes back
    // through the same check, so the second one asks in its turn.
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
    expect(sent.system).toContain('--- active skill: /sb:audit')
    expect(sent.system).toContain('--- active skill: /sb:map')
    expect(sent.system).not.toContain('NOT skill name')
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
    expect(sent.system).toContain('"/audit" and "/map"')
    expect(sent.system).toContain('/sb:audit and /sb:map')
    expect(sent.system).not.toContain('--- active skill')
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
    expect(provider.inputs[0]!.system).toContain('--- active skill: /sb:audit')
  })
})

describe('one message carrying several skills', () => {
  it('colours every token it resolves, wherever each one sits', () => {
    const composer = openComposer()
    type(composer, 'build this from my notes /sb:map then /sb:audit it')
    const ink = skillInk()!
    expect(within(ink).getByText('/sb:map')).toBeTruthy()
    expect(within(ink).getByText('/sb:audit')).toBeTruthy()
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
    expect(sent.system.indexOf('--- active skill: /sb:map')).toBeLessThan(
      sent.system.indexOf('--- active skill: /sb:audit'),
    )
    expect(sent.system).toContain('in this order: /sb:map → /sb:audit')
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
      provider.inputs[0]!.system.split('--- active skill: /sb:map'),
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
