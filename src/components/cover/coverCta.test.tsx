// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoverCta } from '@/components/cover/CoverCta'
import { coverSliceState } from '@/components/cover/coverActions'
import type {
  CoverActions,
  CoverCtaItem,
} from '@/components/cover/coverModel'

// Pins the CTA state table (plan §3.7): loading renders disabled buttons at
// final size, empty replaces them with one sentence, ready wires the first
// slice through, and link CTAs exist only when a repoUrl is configured.
// Plus the no-DB collapse: an error result that still has a fallback list is
// *ready* — the cover page never surfaces fetch failures.

afterEach(cleanup)

const EMPTY_NOTE = 'No slices yet — sb:slice creates the first one.'

const items: CoverCtaItem[] = [
  { kind: 'openCanvas', label: 'Open the blueprint' },
  { kind: 'openSlice', label: 'Open a slice' },
  { kind: 'presentSlice', label: 'Present it' },
  { kind: 'link', label: 'The guide', docPath: '/docs/guide.md' },
]

function renderRow(
  slice: CoverActions['slice'],
  over: { repoUrl?: string; items?: CoverCtaItem[] } = {},
) {
  const actions: CoverActions = {
    openCanvas: vi.fn(),
    openSlice: vi.fn(),
    presentSlice: vi.fn(),
    slice,
  }
  render(
    <CoverCta
      items={over.items ?? items}
      actions={actions}
      repoUrl={'repoUrl' in over ? over.repoUrl : 'https://example.test/repo'}
      emptyNote={EMPTY_NOTE}
    />,
  )
  return actions
}

describe('CoverCta', () => {
  it('ready: slice buttons act on the first slice id', () => {
    const actions = renderRow({ status: 'ready', sliceId: 'slice-7' })
    screen.getByRole('button', { name: 'Open a slice' }).click()
    expect(actions.openSlice).toHaveBeenCalledWith('slice-7')
    screen.getByRole('button', { name: 'Present it' }).click()
    expect(actions.presentSlice).toHaveBeenCalledWith('slice-7')
  })

  it('loading: slice buttons render at final size, disabled and aria-busy', () => {
    renderRow({ status: 'loading' })
    for (const name of ['Open a slice', 'Present it']) {
      const button = screen.getByRole('button', { name })
      expect((button as HTMLButtonElement).disabled).toBe(true)
      expect(button.getAttribute('aria-busy')).toBe('true')
    }
  })

  it('empty: slice buttons are replaced by the muted note, not disabled stubs', () => {
    renderRow({ status: 'empty' })
    expect(screen.queryByRole('button', { name: 'Open a slice' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Present it' })).toBeNull()
    expect(screen.getByText(EMPTY_NOTE)).toBeDefined()
    // Non-slice items still render.
    expect(
      screen.getByRole('button', { name: 'Open the blueprint' }),
    ).toBeDefined()
  })

  it('link CTAs resolve against repoUrl and disappear without one', () => {
    renderRow({ status: 'ready', sliceId: 's' })
    const link = screen.getByRole('link', { name: 'The guide' })
    expect(link.getAttribute('href')).toBe(
      'https://example.test/repo/docs/guide.md',
    )
    cleanup()
    renderRow({ status: 'ready', sliceId: 's' }, { repoUrl: undefined })
    expect(screen.queryByRole('link', { name: 'The guide' })).toBeNull()
  })
})

describe('coverSliceState', () => {
  it('collapses loading / ready / empty', () => {
    expect(coverSliceState({ status: 'loading' })).toEqual({
      status: 'loading',
    })
    expect(
      coverSliceState({
        status: 'ready',
        data: [{ id: 'a' }, { id: 'b' }] as never,
        source: 'database',
      }),
    ).toEqual({ status: 'ready', sliceId: 'a' })
    expect(
      coverSliceState({ status: 'ready', data: [] as never, source: 'database' }),
    ).toEqual({ status: 'empty' })
  })

  it('no database / fetch error with a fallback list is READY, not an error', () => {
    expect(
      coverSliceState({
        status: 'error',
        message: 'Supabase not configured',
        fallback: [{ id: 'demo-slice' }] as never,
      }),
    ).toEqual({ status: 'ready', sliceId: 'demo-slice' })
  })

  it('fetch error with no fallback degrades to empty — never an error banner', () => {
    expect(
      coverSliceState({ status: 'error', message: 'down', fallback: null }),
    ).toEqual({ status: 'empty' })
  })
})
