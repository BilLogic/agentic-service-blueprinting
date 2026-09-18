// @vitest-environment jsdom
/**
 * THE COMPOSER'S FIELD AND ITS INK, asserted through the one interface that
 * owns both.
 *
 * A textarea cannot colour a word inside itself, so the composer draws a
 * mirrored copy of the draft behind a field whose own text has gone
 * transparent. The picture holds only while the two copies agree on the
 * metrics that decide a line break, the trailing newline a block would
 * otherwise collapse, the single positioned box they both size against, the
 * scroll offset, and standing down while an IME composes. Every one of those
 * is asserted here, because every one of them now lives in one module —
 * `ComposerInkedField` and the class lists it reads from
 * `composerFieldMetrics.ts`. Four of them used to be spelled in the chat
 * panel's render body, where the agreement was a comment and the assertion
 * had to pick two nodes out of the tree and split their class attributes.
 *
 * What a reader MEETS — the menu opening mid-sentence, the near-miss notice,
 * what sends — is in `agentComposerSkills.test.tsx` over the real panel. This
 * file drives the module directly, with the draft held by a harness that
 * completes a token the way accepting from the menu does.
 */
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ComposerInkedField } from '@/components/editor/agent/ComposerInkedField'
import {
  COMPOSER_FIELD_METRICS,
  composerInkedFieldClasses,
} from '@/components/editor/agent/composerFieldMetrics'
import {
  AGENT_SKILL_COMMANDS,
  completeSkillToken,
  findSkillLookup,
  findSkillTokens,
  skillMatchesQuery,
} from '@/lib/agent/skills'

/**
 * The field with a draft it owns, which is the shape every caller has: the
 * tokens are read out of the text and nowhere else, so a keystroke is the
 * only thing that can change what is coloured.
 *
 * Tab completes the token under the lookup in place, which is what accepting
 * from the slash menu does. It is here rather than in the module because the
 * menu is the panel's and the rewrite is `skills.ts`'s — what this file needs
 * from it is the caret it leaves behind.
 */
function Harness() {
  const [draft, setDraft] = useState('')
  return (
    <ComposerInkedField
      draft={draft}
      tokens={findSkillTokens(draft)}
      onDraftChange={setDraft}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        event.preventDefault()
        const lookup = findSkillLookup(draft)
        if (!lookup) return
        const command = AGENT_SKILL_COMMANDS.find(
          (candidate) =>
            candidate.content && skillMatchesQuery(candidate, lookup.query),
        )
        if (command) setDraft(completeSkillToken(draft, lookup, command))
      }}
      placeholder="Message the agent…"
    />
  )
}

const openField = (): HTMLTextAreaElement => {
  render(<Harness />)
  return screen.getByRole('textbox', {
    name: 'Message the agent',
  }) as HTMLTextAreaElement
}

const type = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } })

/**
 * The mirror. It is `aria-hidden`, so it is queried the one way a hidden node
 * can be: by the slot it declares.
 */
const ink = () =>
  document.querySelector<HTMLElement>('[data-slot="composer-skill-ink"]')

afterEach(cleanup)

describe('the field and its ink wear one agreement', () => {
  it('spreads every metric onto both copies from one call', () => {
    // The shimmer guard, and the reason it reads like this. Two copies of one
    // string wrap alike only while they agree on every property that decides
    // a line break; the agreement is one string, and both class lists are
    // built by one function, so this asks that function for the pair and
    // checks the string survived into both. The old version of this test had
    // to render the panel, find two nodes and split their class attributes —
    // which is exactly the shape that let an edit touch one of them.
    const classes = composerInkedFieldClasses(true)
    for (const metric of COMPOSER_FIELD_METRICS.split(' ')) {
      expect(classes.field.split(' '), metric).toContain(metric)
      expect(classes.mirror.split(' '), metric).toContain(metric)
    }
  })

  it('hands the drawing over only while the ink is up', () => {
    // Transparent text with nothing behind it is an empty composer.
    expect(composerInkedFieldClasses(true).field).toContain('text-transparent')
    expect(composerInkedFieldClasses(false).field).not.toContain(
      'text-transparent',
    )
  })

  it('resolves the ink and the field to the same positioned box', () => {
    // The containing-block guard. `absolute inset-0` measures the nearest
    // POSITIONED ancestor, and the ink wraps like the field only while that
    // ancestor is the box the field sizes. Measured against the input group
    // instead, an add-on in the group narrows the FIELD through the group's
    // own `has-[>[data-align=...]]` rules and leaves the ink full width:
    // every line from the first wrap down breaks somewhere else and the
    // colour drifts off the caret. The module renders the group itself and
    // takes no children, so there is no add-on a caller can put there.
    const field = openField()
    type(field, 'Hey can u /sb:audit the intake')
    const box = ink()!.parentElement!
    expect(box).toBe(field.parentElement)
    expect(box.className.split(' ')).toContain('relative')
    // And that box is not the group: the group is what an add-on would join.
    expect(box.dataset.slot).toBeUndefined()
  })

  it('keeps the group growing as the draft wraps', () => {
    // The input group grows for a DIRECT-child textarea
    // (`has-[>textarea]:h-auto`) and the field is a grandchild of it, so the
    // height is spelled. Without it a wrapping draft is typed into a 28px
    // slot with its first line scrolled out of sight — jsdom lays nothing
    // out, so what is pinned here is the class the browser needs.
    const field = openField()
    const group = field.closest('[data-slot="input-group"]')!
    expect(group.className.split(' ')).toContain('h-auto')
  })
})

describe('the ink draws the draft the field is holding', () => {
  it('colours every token that names a skill, wherever it sits', () => {
    const field = openField()
    type(field, 'build from my notes /sb:map then /sb:audit it')
    const mirror = ink()!
    // The same string, so the caret and the colour agree. The trailing
    // newline is the one a block would otherwise collapse, which would leave
    // the two with different scroll heights at the bottom of a long draft.
    expect(mirror.textContent).toBe(
      'build from my notes /sb:map then /sb:audit it\n',
    )
    expect(within(mirror).getByText('/sb:map').className).toContain(
      'text-text-primary',
    )
    expect(within(mirror).getByText('/sb:audit').className).toContain(
      'text-text-primary',
    )
    expect(field.className).toContain('text-transparent')
  })

  it('leaves the field drawing its own text when no token resolves', () => {
    const field = openField()
    // A bare alias resolves nothing, so nothing is coloured and nothing runs.
    type(field, 'then /audit the intake')
    expect(ink()).toBeNull()
    expect(field.className).not.toContain('text-transparent')
  })

  it('follows the field when a long message scrolls', () => {
    const field = openField()
    type(field, 'Hey can u /sb:audit the intake')
    field.scrollTop = 40
    field.scrollLeft = 5
    fireEvent.scroll(field)
    expect(ink()!.scrollTop).toBe(40)
    expect(ink()!.scrollLeft).toBe(5)
  })

  it('catches up on the keystroke that moved the field without a scroll event', () => {
    // A keystroke at the bottom of a scrolled field moves its scrollTop and
    // fires no scroll event in time to matter, so the sync runs after the
    // write too — before paint, or the colour lags a frame behind the caret
    // on every character typed.
    const field = openField()
    type(field, 'Hey can u /sb:audit the intake')
    field.scrollTop = 24
    type(field, 'Hey can u /sb:audit the intake once more')
    expect(ink()!.scrollTop).toBe(24)
  })

  it('stands down while an IME is composing', () => {
    const field = openField()
    type(field, 'Hey can u /sb:audit')
    expect(ink()).toBeTruthy()
    // A preedit string lives in the field, and transparent text would make it
    // invisible for as long as it is being composed.
    fireEvent.compositionStart(field)
    expect(ink()).toBeNull()
    expect(field.className).not.toContain('text-transparent')
    fireEvent.compositionEnd(field)
    expect(ink()).toBeTruthy()
  })
})

describe('an in-place completion', () => {
  it('leaves the caret after the token it completed', () => {
    // No caret write goes with the completion, and this is the property that
    // makes that safe: a lookup's span reaches the end of the draft, so the
    // end is where the reader was already typing. The field is focused and
    // its caret set BEFORE the completion on purpose — that is the path
    // React's own selection restoration runs on, and a restore to the
    // pre-completion offset would leave the caret inside the word it just
    // finished.
    const field = openField()
    type(field, 'Hey can u /sb:aud')
    field.focus()
    field.setSelectionRange(17, 17)
    fireEvent.keyDown(field, { key: 'Tab' })
    expect(field.value).toBe('Hey can u /sb:audit ')
    expect(field.selectionStart).toBe(field.value.length)
    // And the completed token is coloured where the reader typed it.
    expect(within(ink()!).getByText('/sb:audit')).toBeTruthy()
  })
})
