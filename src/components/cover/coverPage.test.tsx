// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { COVER_MEASURE } from '@/components/cover/coverMeasure'
import { CoverPageView } from '@/components/cover/CoverPage'
import type { CoverContent } from '@/components/cover/coverModel'

// Pins the cover page's surface contract (plan 2026-08-18-001): the tab
// machinery (roles, selection, body switching), the figure plate, the
// empty-figure-slot rule, the single-action header, and the content-as-data
// rule — the view renders whatever the content module says, with no strings
// of its own beyond ARIA affordances.

beforeAll(() => {
  // jsdom has no ResizeObserver; the indicator effect needs one to exist.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(cleanup)

const content = (over: Partial<CoverContent> = {}): CoverContent => ({
  title: 'Test Workspace',
  lede: 'A lede with a **bold** term.',
  primaryCtaLabel: 'Open the blueprint',
  repoUrl: 'https://example.test/repo',
  chip: { copyLabel: 'Copy', copiedLabel: 'Copied' },
  states: { noSlices: 'No slices yet.' },
  tabs: [
    {
      value: 'one',
      label: 'First tab',
      sections: [
        {
          kind: 'prose',
          id: 'p1',
          heading: 'First heading',
          paragraphs: ['First body.'],
          figure: {
            src: '/cover/first.svg',
            alt: 'What the first figure shows',
            width: 880,
            height: 400,
          },
        },
        {
          // The empty-slot case: prose stands alone, no image, no placeholder.
          kind: 'prose',
          id: 'p-noFigure',
          heading: 'Awaiting a figure',
          paragraphs: ['This section carries its own weight.'],
        },
      ],
      link: { label: 'Learn more →', docPath: 'docs/guide/02-x.md' },
    },
    {
      value: 'two',
      label: 'Second tab',
      sections: [
        {
          kind: 'skill',
          id: 's1',
          command: '/sb:map',
          description: 'Second body. Produces a validated blueprint file.',
        },
        {
          kind: 'defs',
          id: 'd1',
          heading: 'A defs list',
          columns: { term: 'Term', definition: 'Meaning' },
          items: [
            { term: 'first term', definition: 'What the first term means.' },
            { term: 'second term', definition: 'What the second term means.' },
          ],
        },
      ],
    },
  ],
  ...over,
})

describe('CoverPageView', () => {
  it('renders the header from content and fires the one action', () => {
    const onOpenCanvas = vi.fn()
    render(<CoverPageView content={content()} onOpenCanvas={onOpenCanvas} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Test Workspace',
    )
    screen.getByRole('button', { name: 'Open the blueprint' }).click()
    expect(onOpenCanvas).toHaveBeenCalledTimes(1)
  })

  it('offers no other NAVIGATING button on the page — the header action stands alone', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    /*
      "The only button" stopped being literally true once figures became
      click-to-expand — that is a second class of button by design, and a
      legitimate one: it never navigates, writes, or leaves the page, it
      opens the same image larger. What still has to hold is the ORIGINAL
      guarantee this test protects: nothing on the page competes with
      "Open the blueprint" as a way to LEAVE the cover. Tab triggers were
      already excluded on the same reasoning; figure triggers join them.
    */
    const buttons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('role') !== 'tab')
      .filter((button) => !button.getAttribute('aria-label')?.startsWith('Expand:'))
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Open the blueprint',
    ])
  })

  it('exposes the WAI-ARIA tabs pattern with exactly one selected trigger', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    expect(screen.getByRole('tablist')).toBeDefined()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'First tab',
      'Second tab',
    ])
    const selected = tabs.filter(
      (tab) => tab.getAttribute('aria-selected') === 'true',
    )
    expect(selected).toHaveLength(1)
    expect(selected[0]?.textContent).toBe('First tab')
    expect(screen.getByRole('tabpanel')).toBeDefined()
  })

  it('switches the visible body on tab click', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    expect(screen.getByText('First body.')).toBeDefined()
    expect(screen.queryByText('Second body.')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Second tab' }))
    expect(screen.getByText(/Second body\./)).toBeDefined()
    expect(screen.queryByText('First body.')).toBeNull()
    expect(
      screen
        .getByRole('tab', { name: 'Second tab' })
        .getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('renders a figure bare — the artwork is its own plate', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    const img = screen.getByRole('img', { name: 'What the first figure shows' })
    /*
      Every figure is authored with a full-bleed rounded background rect
      across its whole viewBox, so it already IS a plate. A border, padding
      and a white background here drew a frame around a frame — the page
      read as boxes inside boxes. That self-plate is also what carries dark
      mode, since the figures are authored light and an <img> seals page CSS
      out of them.
    */
    for (const duplicated of ['bg-white', 'border', 'rounded', 'p-3', 'ring']) {
      expect(img.className, duplicated).not.toContain(duplicated)
    }
    expect(img.getAttribute('width')).toBe('880')
    expect(img.getAttribute('height')).toBe('400')
  })

  it('holds every block to one measure, so the column edge never moves', () => {
    const { container } = render(
      <CoverPageView content={content()} onOpenCanvas={vi.fn()} />,
    )
    /*
      Two separate misalignments lived here. Figures sat at `max-w-3xl`
      against the prose's `max-w-2xl`, overhanging by 6rem so the page
      zig-zagged at every image; and the header's lede was `max-w-3xl`
      against `max-w-2xl` content, so the title block and the tab body did
      not share an edge. Both are the same defect — a width written twice —
      so the fix is one token and this is the test that keeps it one.
    */
    // COVER_MEASURE now lives on the figure's click-to-expand trigger, not
    // the bare <img> — the button is the sized element, the image fills it.
    const figureTrigger = screen.getByRole('button', {
      name: 'Expand: What the first figure shows',
    })
    expect(figureTrigger.className).toContain(COVER_MEASURE)

    const lede = container.querySelector('header p')
    expect(lede?.className).toContain(COVER_MEASURE)

    // And no CONTENT block restates a width of its own. The page shell is
    // exempt by name: it is the gutter the content sits in, not a block.
    for (const el of container.querySelectorAll('[class*="max-w-"]')) {
      if (el.hasAttribute('data-cover-shell')) continue
      expect(el.className, el.tagName).toContain(COVER_MEASURE)
    }
  })

  it('a section with an empty figure slot renders prose-only — no img, no placeholder', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    expect(screen.getByText('This section carries its own weight.')).toBeDefined()
    // Exactly one image on the tab: the section that has a figure.
    expect(screen.getAllByRole('img')).toHaveLength(1)
    // And nothing anywhere points at an unresolved source.
    for (const img of document.querySelectorAll('img')) {
      expect(img.getAttribute('src')).toBeTruthy()
    }

    // The skill section on tab two also has no figure, and still renders.
    fireEvent.click(screen.getByRole('tab', { name: 'Second tab' }))
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    // What the skill produces is folded into its description now, not a
    // separate labeled line below the figure.
    expect(screen.getByRole('tabpanel').textContent).toContain(
      'Produces a validated blueprint file.',
    )
  })

  it('renders a defs list as a real table with a header row', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Second tab' }))

    const table = screen.getByRole('table')
    const headers = screen.getAllByRole('columnheader')
    expect(headers.map((cell) => cell.textContent)).toEqual(['Term', 'Meaning'])
    // The header row is a muted ground; the rows are bordered with tokens.
    expect(table.querySelector('thead tr')?.className).toContain('bg-muted/50')
    expect(table.querySelector('thead th')?.className).toContain('border-border')
    // The term column is a row header, and it carries the emphasis.
    const rowHeaders = screen.getAllByRole('rowheader')
    expect(rowHeaders.map((cell) => cell.textContent)).toEqual([
      'first term',
      'second term',
    ])
    expect(rowHeaders[0]?.className).toContain('font-semibold')
  })

  it('stacks every figure section the same way — no side-by-side variant', () => {
    const { container } = render(
      <CoverPageView content={content()} onOpenCanvas={vi.fn()} />,
    )
    expect(container.querySelector('[class*="lg:grid-cols-"]')).toBeNull()
    const plate = screen.getByRole('img', {
      name: 'What the first figure shows',
    })
    // Prose above, figure below, in one column. The image's own parent is
    // now its click-to-expand trigger button, so the stacking check looks
    // one level further up, at the section container that actually lays
    // prose and figure out vertically.
    expect(plate.parentElement?.parentElement?.className).toContain('flex-col')
  })

  it('renders the guide link as quiet inline text when repoUrl is set', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    const link = screen.getByRole('link', { name: 'Learn more →' })
    expect(link.getAttribute('href')).toBe(
      'https://example.test/repo/blob/main/docs/guide/02-x.md',
    )
    expect(link.tagName).toBe('A')
  })

  it('drops the guide link entirely when the deployment has no repoUrl', () => {
    render(
      <CoverPageView
        content={content({ repoUrl: undefined })}
        onOpenCanvas={vi.fn()}
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('falls back to the tab intro and renders bold runs in the lede as <strong>', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    expect(screen.getByText('bold').tagName).toBe('STRONG')
  })
})
