// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { CoverPageView } from '@/components/cover/CoverPage'
import type {
  CoverActions,
  CoverContent,
} from '@/components/cover/coverModel'

// Pins the cover page's surface contract (plan 2026-08-18-001): the tab
// machinery (roles, selection, body switching), the figure plate, and the
// content-as-data rule — the view renders whatever the content module says,
// with no strings of its own beyond ARIA affordances.

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

const actions = (over: Partial<CoverActions> = {}): CoverActions => ({
  openCanvas: vi.fn(),
  openSlice: vi.fn(),
  presentSlice: vi.fn(),
  slice: { status: 'ready', sliceId: 'slice-1' },
  ...over,
})

const content: CoverContent = {
  title: 'Test Workspace',
  lede: 'A lede with a **bold** term.',
  primaryCtaLabel: 'Open the blueprint',
  repoUrl: 'https://example.test/repo',
  sliceEmptyNote: 'No slices yet.',
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
      ],
    },
    {
      value: 'two',
      label: 'Second tab',
      sections: [
        {
          kind: 'prose',
          id: 'p2',
          heading: 'Second heading',
          paragraphs: ['Second body.'],
        },
      ],
    },
  ],
}

describe('CoverPageView', () => {
  it('renders the header from content and fires openCanvas from the primary CTA', () => {
    const a = actions()
    render(<CoverPageView content={content} actions={a} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Test Workspace',
    )
    screen.getByRole('button', { name: 'Open the blueprint' }).click()
    expect(a.openCanvas).toHaveBeenCalledTimes(1)
  })

  it('exposes the WAI-ARIA tabs pattern with exactly one selected trigger', () => {
    render(<CoverPageView content={content} actions={actions()} />)
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
  })

  it('switches the visible body on tab click', () => {
    render(<CoverPageView content={content} actions={actions()} />)
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
    render(<CoverPageView content={content} actions={actions()} />)
    const img = screen.getByRole('img', { name: 'What the first figure shows' })
    // The plate is deliberately light in both themes — the figures are
    // authored light and an <img> seals page CSS out of them.
    expect(img.className).toContain('bg-white')
    expect(img.className).toContain('dark:ring-1')
    expect(img.getAttribute('width')).toBe('880')
    expect(img.getAttribute('height')).toBe('400')
  })

  it('renders bold runs in the lede as <strong>', () => {
    render(<CoverPageView content={content} actions={actions()} />)
    const strong = screen.getByText('bold')
    expect(strong.tagName).toBe('STRONG')
  })
})
