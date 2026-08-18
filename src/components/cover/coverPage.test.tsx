// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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
          purpose: 'Second body.',
          producesLabel: 'Produces',
          produces: 'A validated blueprint file.',
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

  it('offers no other button on the page — the header action stands alone', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    const buttons = screen
      .getAllByRole('button')
      // Tab triggers are buttons by role; they are not page actions.
      .filter((button) => button.getAttribute('role') !== 'tab')
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
    expect(screen.getByText('Second body.')).toBeDefined()
    expect(screen.queryByText('First body.')).toBeNull()
    expect(
      screen
        .getByRole('tab', { name: 'Second tab' })
        .getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('renders every figure with alt text on the light plate in both themes', () => {
    render(<CoverPageView content={content()} onOpenCanvas={vi.fn()} />)
    const img = screen.getByRole('img', { name: 'What the first figure shows' })
    // The plate is deliberately light in both themes — the figures are
    // authored light and an <img> seals page CSS out of them.
    expect(img.className).toContain('bg-white')
    expect(img.className).toContain('dark:ring-1')
    expect(img.getAttribute('width')).toBe('880')
    expect(img.getAttribute('height')).toBe('400')
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
    // The Produces line splits its label and body across nodes; read the panel.
    expect(screen.getByRole('tabpanel').textContent).toContain(
      'Produces — A validated blueprint file.',
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
    // Prose above, figure below, in one column.
    expect(plate.parentElement?.className).toContain('flex-col')
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
