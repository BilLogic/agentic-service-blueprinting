// @vitest-environment jsdom
/**
 * Every definition in the app opens the same way and looks the same.
 *
 * The card's own seam is the CARD. "One section and two sections are typeset
 * identically" is the assertion that stops the pattern drifting into two
 * shapes — a category half in a small-caps eyebrow and an instance half in a
 * plain medium-weight name, inside one card.
 *
 * The board wiring is exercised through the two labels this template renders a
 * definition popover on — a path badge and a scenario/phase title badge — plus
 * the per-service example the popover grounds each generic definition with.
 */
import type { ReactElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DefinitionCard,
  DefinitionPopover,
} from '@/components/blueprint/DefinitionCard'
import { EntityDefinitionPopover } from '@/components/blueprint/EntityDefinitionPopover'
import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import { ScenarioTitleBadge } from '@/components/blueprint/ScenarioTitleBadge'
import {
  ENTITY_EXAMPLE_PLACEHOLDER,
  ENTITY_KIND_DEFINITIONS,
  PANEL_TERMS,
} from '@/lib/panelTerms'
import { CanvasModeContext } from '@/contexts/canvasModeContext'
import { EntityExamplesContext } from '@/contexts/EntityExamplesContext'

afterEach(cleanup)

/* --------------------------------------------------------- opening one */

/**
 * Hover, as Base UI actually learns it.
 *
 * Base UI's hover interaction is `mouseOnly`: it decides from a pointer type
 * it records on React's `onPointerEnter`, and React synthesises that handler
 * from `pointerover` rather than `pointerenter`. A `mouseOver` alone leaves
 * the pointer type unset and the popover never opens. The working sequence is
 * pointerover → mouseenter → mousemove. jsdom has no `PointerEvent`, so the
 * first is a `MouseEvent` with the property attached.
 */
function hover(element: Element) {
  // The TRIGGER, not whatever text node was queried. A badge sets its name in
  // an inner `<span>`, and `mouseenter` does not bubble.
  const trigger =
    element.closest('[tabindex], [role="button"], button') ?? element
  const pointerOver = new MouseEvent('pointerover', {
    bubbles: true,
    cancelable: true,
  })
  Object.defineProperty(pointerOver, 'pointerType', { value: 'mouse' })
  trigger.dispatchEvent(pointerOver)
  fireEvent.mouseEnter(trigger)
  fireEvent.mouseMove(trigger)
}

/*
  The card is marked with `data-definition-card` rather than a test id, so the
  attribute a stylesheet or a future guard would read is the one this file
  reads.
*/
const sections = (card: HTMLElement) =>
  Array.from(card.querySelectorAll('[data-definition-section]'))

const eyebrow = (section: Element) =>
  section.querySelector('[data-definition-eyebrow]') as HTMLElement

const body = (section: Element) =>
  section.querySelector('[data-definition-body]') as HTMLElement

/* -------------------------------------------------- the card is one shape */

describe('the definition card', () => {
  const one = [{ eyebrow: 'Path', body: ENTITY_KIND_DEFINITIONS.path.definition }]
  const two = [
    ...one,
    { eyebrow: 'Happy Path', body: 'The customer joins on time.' },
  ]

  it('sets a category and an instance identically — one shape, not two', () => {
    render(<DefinitionCard sections={two} />)
    const card = document.querySelector('[data-definition-card]') as HTMLElement
    const [category, instance] = sections(card)
    expect(eyebrow(instance).className).toBe(eyebrow(category).className)
    expect(body(instance).className).toBe(body(category).className)
  })

  it('sets a one-section card exactly as it sets a two-section one', () => {
    render(<DefinitionCard sections={one} />)
    const alone = sections(
      document.querySelector('[data-definition-card]') as HTMLElement,
    )[0]
    const aloneClasses = [eyebrow(alone).className, body(alone).className]
    cleanup()

    render(<DefinitionCard sections={two} />)
    const paired = sections(
      document.querySelector('[data-definition-card]') as HTMLElement,
    )
    for (const section of paired) {
      expect([eyebrow(section).className, body(section).className]).toEqual(
        aloneClasses,
      )
    }
  })

  it('separates sections with a hairline and never heads one with it', () => {
    render(<DefinitionCard sections={two} />)
    const [first, second] = sections(
      document.querySelector('[data-definition-card]') as HTMLElement,
    )
    expect(first.className).not.toContain('border-t')
    expect(second.className).toContain('border-t')
  })
})

/* ------------------------------------------------ every definition opens */

describe('a definition opens on hover, and is reachable without a pointer', () => {
  it('opens the card on hover', async () => {
    render(
      <DefinitionPopover sections={[{ eyebrow: 'Lane', body: 'One row.' }]}>
        <span>Front stage</span>
      </DefinitionPopover>,
    )
    hover(screen.getByText('Front stage'))
    expect(await screen.findByText('One row.')).toBeDefined()
  })

  it('gives the trigger a tab stop, so focus reaches it', () => {
    render(
      <DefinitionPopover sections={[{ eyebrow: 'Lane', body: 'One row.' }]}>
        <span>Front stage</span>
      </DefinitionPopover>,
    )
    const trigger = screen.getByText('Front stage')
    expect(trigger.getAttribute('tabindex')).toBe('0')
    trigger.focus()
    expect(document.activeElement).toBe(trigger)
  })
})

/* ----------------------------------------- the two board-label surfaces */

describe('the board labels that show a category and an instance', () => {
  const rendered: Array<[string, () => void, string]> = [
    [
      'a path badge',
      () =>
        render(
          <PathLabelBadge
            name="Happy Path"
            summary="The customer joins on time."
            pathKind="happy"
          />,
        ),
      'Happy Path',
    ],
    [
      'a scenario title badge',
      () =>
        render(
          <ScenarioTitleBadge name="Warm-Up" summary="The first minutes." />,
        ),
      'Warm-Up',
    ],
  ]

  it.each(rendered)(
    '%s renders two identically set sections',
    async (_name, mount, label) => {
      mount()
      hover(screen.getByText(label))
      const card = await screen.findByText(label, {
        selector: '[data-definition-eyebrow]',
      })
      const parts = sections(
        card.closest('[data-definition-card]') as HTMLElement,
      )
      expect(parts).toHaveLength(2)
      expect(eyebrow(parts[1]).className).toBe(eyebrow(parts[0]).className)
      expect(body(parts[1]).className).toBe(body(parts[0]).className)
    },
  )
})

/* -------------------------------------------------- the definition popover */

describe('an entity definition', () => {
  it('is one section when there is only a kind to give', async () => {
    render(
      <EntityDefinitionPopover kind="lane">
        <span>Front stage</span>
      </EntityDefinitionPopover>,
    )
    hover(screen.getByText('Front stage'))
    await screen.findByText(ENTITY_KIND_DEFINITIONS.lane.definition)
    const card = document.querySelector('[data-definition-card]') as HTMLElement
    expect(sections(card)).toHaveLength(1)
    expect(eyebrow(sections(card)[0]).textContent).toBe('Lane')
  })

  it('says so when nobody has written the instance description yet', async () => {
    render(
      <EntityDefinitionPopover
        kind="path"
        name="Happy Path"
        description={null}
        showDescription
      >
        <span>Happy Path</span>
      </EntityDefinitionPopover>,
    )
    hover(screen.getByText('Happy Path'))
    const card = (
      await screen.findByText(ENTITY_KIND_DEFINITIONS.path.definition)
    ).closest('[data-definition-card]') as HTMLElement
    const [, instance] = sections(card)
    // The placeholder changes the BODY only. The heading is the heading.
    expect(body(instance).className).toContain('italic')
    expect(eyebrow(instance).className).toBe(eyebrow(sections(card)[0]).className)
  })
})

/* ------------------------------- the term map, and the generic definitions */

describe('the made-up words and the entity kinds', () => {
  it('the term map holds only the words a reader could not guess', () => {
    expect(Object.keys(PANEL_TERMS).sort()).toEqual(['storyboard', 'touchpoint'])
  })

  it('a definition never opens by naming the term the eyebrow already prints', () => {
    for (const [term, definition] of Object.entries(PANEL_TERMS)) {
      expect(
        definition.toLowerCase().startsWith(term.toLowerCase()),
        term,
      ).toBe(false)
    }
  })

  it('the six entity-kind definitions are the generic set, carrying no instance example', () => {
    const definitions = Object.fromEntries(
      Object.entries(ENTITY_KIND_DEFINITIONS).map(([kind, term]) => [
        kind,
        term.definition,
      ]),
    )
    expect(definitions).toEqual({
      service:
        'The whole service this blueprint maps, end to end. Everything else on the board is part of it.',
      phase:
        'A chapter of the service, in time order. Each phase holds the scenarios that can happen during it.',
      scenario: 'A specific situation inside a phase, mapped on its own board.',
      path: 'One route through a scenario: the main way, plus variants and exceptions. Paths are alternatives, not stages — nothing carries across them.',
      step: 'A column of the board: one moment in time, read down every lane at once. Steps run left to right.',
      lane: 'A row of the board, for one kind of participant — the customer, frontstage staff, backstage work, the tools. A row reads across every step.',
    })
  })
})

/* --------------------------------------- the deployment's own example */

/** Design mode, injected the way a test reaches the shared canvas mode. */
function designMode(children: ReactElement) {
  return (
    <CanvasModeContext.Provider
      value={{ mode: 'design', setMode: () => {}, available: true }}
    >
      {children}
    </CanvasModeContext.Provider>
  )
}

describe('the example grounds the generic definition in this deployment', () => {
  it('shows the authored example under the kind, set like every other section', async () => {
    render(
      <EntityExamplesContext.Provider
        value={{ lane: 'The tutor row on this board' }}
      >
        <EntityDefinitionPopover kind="lane">
          <span>Front stage</span>
        </EntityDefinitionPopover>
      </EntityExamplesContext.Provider>,
    )
    hover(screen.getByText('Front stage'))
    const card = (
      await screen.findByText('The tutor row on this board')
    ).closest('[data-definition-card]') as HTMLElement
    const [kind, example] = sections(card)
    expect(sections(card)).toHaveLength(2)
    expect(eyebrow(example).textContent).toBe('Example')
    expect(eyebrow(example).className).toBe(eyebrow(kind).className)
    expect(body(example).className).toBe(body(kind).className)
  })

  it('is picked by kind — a phase popover shows the phase example, not another', async () => {
    render(
      <EntityExamplesContext.Provider
        value={{ phase: 'Warm-up', lane: 'The tutor row' }}
      >
        <EntityDefinitionPopover kind="phase">
          <span>A phase</span>
        </EntityDefinitionPopover>
      </EntityExamplesContext.Provider>,
    )
    hover(screen.getByText('A phase'))
    await screen.findByText('Warm-up')
    expect(screen.queryByText('The tutor row')).toBeNull()
  })

  it('renders nothing for a reader when the example is blank', async () => {
    render(
      <EntityExamplesContext.Provider value={{}}>
        <EntityDefinitionPopover kind="lane">
          <span>Front stage</span>
        </EntityDefinitionPopover>
      </EntityExamplesContext.Provider>,
    )
    hover(screen.getByText('Front stage'))
    const card = (
      await screen.findByText(ENTITY_KIND_DEFINITIONS.lane.definition)
    ).closest('[data-definition-card]') as HTMLElement
    expect(sections(card)).toHaveLength(1)
    expect(
      screen.queryByText('Example', { selector: '[data-definition-eyebrow]' }),
    ).toBeNull()
  })

  it('shows the unwritten placeholder to an editor when the example is blank', async () => {
    render(
      designMode(
        <EntityDefinitionPopover kind="lane">
          <span>Front stage</span>
        </EntityDefinitionPopover>,
      ),
    )
    hover(screen.getByText('Front stage'))
    const card = (
      await screen.findByText(ENTITY_EXAMPLE_PLACEHOLDER)
    ).closest('[data-definition-card]') as HTMLElement
    const [kind, example] = sections(card)
    expect(eyebrow(example).textContent).toBe('Example')
    expect(body(example).className).toContain('italic')
    expect(eyebrow(example).className).toBe(eyebrow(kind).className)
  })
})
