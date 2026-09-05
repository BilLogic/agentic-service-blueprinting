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
 *
 * What is rendered and what is read as text, and why:
 *
 *   - the card, the two-section surfaces and the canvas title are RENDERED,
 *     because the claims are about what a reader sees and in what order;
 *   - "no cue and no ⓘ survive" is read as TEXT, because it is a claim about
 *     the whole tree and no single render can observe an absence everywhere.
 */
import type { ReactElement, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DefinitionCard,
  DefinitionPopover,
} from '@/components/blueprint/DefinitionCard'
import { EntityDefinitionPopover } from '@/components/blueprint/EntityDefinitionPopover'
import { EntityTitleAffordance } from '@/components/blueprint/EntityTitleAffordance'
import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import { ScenarioTitleBadge } from '@/components/blueprint/ScenarioTitleBadge'
import {
  ENTITY_EXAMPLE_PLACEHOLDER,
  ENTITY_KIND_DEFINITIONS,
  PANEL_TERMS,
} from '@/lib/panelTerms'
import { CanvasModeContext } from '@/contexts/canvasModeContext'
import { EntityDetailProvider } from '@/contexts/EntityDetailContext'
import { EntityExamplesContext } from '@/contexts/EntityExamplesContext'

afterEach(cleanup)

/**
 * A render inside the entity panel's provider.
 *
 * `EntityTitleAffordance` reads the panel through `useEntityDetail`, which
 * throws outside the provider — the app mounts it once, on `EditorShell`,
 * above every tree. A test renders the affordance alone, so it brings the
 * provider with it.
 */
function renderWithEntityDetail(ui: ReactNode) {
  return render(<EntityDetailProvider>{ui}</EntityDetailProvider>)
}

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

/* ------------------------------------------- nothing announces a definition */

// `process.cwd()`, not `import.meta.url`: Vite rewrites a module's own URL to
// its `/@fs/…` serving path, which is not a path on disk.
const ROOT = process.cwd()
const SRC = resolve(ROOT, 'src')

function sourceFiles(dir = SRC): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    let directory: boolean
    try {
      directory = statSync(path).isDirectory()
    } catch {
      return []
    }
    if (directory) return sourceFiles(path)
    if (!/\.tsx?$/.test(entry)) return []
    if (/\.test\.tsx?$/.test(entry)) return []
    return [path]
  })
}

/**
 * Class strings only — a comment recording why the cue went is not the cue.
 *
 * A vanished file is skipped rather than thrown on: vitest runs files in
 * parallel, so a walk of the tree can list a path that is gone by the time it
 * is read. The subject is every file that IS there.
 */
function liveClassMatches(pattern: RegExp): string[] {
  return sourceFiles().flatMap((path) => {
    let source: string
    try {
      source = readFileSync(path, 'utf8')
    } catch {
      return []
    }
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
    return pattern.test(code) ? [relative(ROOT, path)] : []
  })
}

describe('nothing on the page announces that a word is defined', () => {
  it('the shared underline cue is deleted, with every use site', () => {
    expect(liveClassMatches(/DEFINED_LABEL_CUE/)).toEqual([])
    // And the underline it drew, in case somebody inlines it back.
    expect(liveClassMatches(/decoration-dotted/)).toEqual([])
  })

  it('the canvas title draws no icon beside the name', () => {
    renderWithEntityDetail(
      <EntityTitleAffordance kind="scenario" id="s-1" label="Warm-Up" />,
    )
    const block = document.querySelector('[data-entity-title]') as HTMLElement
    // The ⓘ existed because a hover-only control is invisible on touch. The
    // opener is the whole block and the definition is a popover, so neither
    // ever needed it.
    expect(block.querySelectorAll('svg')).toHaveLength(0)
  })

  it('and the entity title imports no icon at all', () => {
    const source = readFileSync(
      join(SRC, 'components/blueprint/EntityTitleAffordance.tsx'),
      'utf8',
    )
    expect(source).not.toMatch(/from 'lucide-react'/)
  })

  it('and the grid headers reach for no icon library, touch ⓘ notwithstanding', () => {
    // A mark came BACK to these headers, but only as the touch reader's door
    // to the definition — invisible on a device that can hover, so the resting
    // board a pointer reader sees stays clean. It is a hand-drawn glyph,
    // deliberately, so the "no icon-library sprawl" rule the headers hold
    // still stands: the exception is one touch affordance, not a licence to
    // import a sheet of icons.
    for (const file of ['StepHeaderAffordance', 'LaneHeaderAffordance']) {
      const source = readFileSync(
        join(SRC, `components/blueprint/${file}.tsx`),
        'utf8',
      )
      expect(source).not.toMatch(/from 'lucide-react'/)
    }
  })

  it('and the class the glyph wore is gone, not just unused', () => {
    // Left in place it is an invitation: the next header draws an ⓘ because
    // the constant is sitting there already named for the job.
    expect(liveClassMatches(/CANVAS_HEADER_HINT/)).toEqual([])
  })
})

describe('a definition hangs off a badge, never off a label', () => {
  it('the canvas title carries the panel, not a definition', () => {
    // The title and the kind badge beside it must not both carry the same
    // definition. The badge is the one that keeps it. The title opens the
    // entity PANEL, so it IS interactive — but no definition popover hangs
    // off it: no `aria-haspopup`, which is what marks a definition trigger
    // elsewhere in this file.
    renderWithEntityDetail(
      <EntityTitleAffordance kind="scenario" id="s-1" label="Warm-Up" />,
    )
    const title = screen.getByRole('button', { name: 'View details: Warm-Up' })
    expect(title.hasAttribute('aria-haspopup')).toBe(false)
  })

  it('and its source no longer reaches for the definition popover', () => {
    const source = readFileSync(
      join(SRC, 'components/blueprint/EntityTitleAffordance.tsx'),
      'utf8',
    )
    expect(source).not.toMatch(/EntityDefinitionPopover/)
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
