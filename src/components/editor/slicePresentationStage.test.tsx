// @vitest-environment jsdom
/**
 * The presentation stage: one left-aligned column, even image frames.
 *
 * Every frame on a slide is the same 4:3 box, whatever the pictures inside
 * measure — the image fits inside the frame and never sizes it. The column
 * count is a rule of the image count alone. The counter, title and caption
 * read the same on a slide with pictures as on one without.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SliceBlueprint } from '@/hooks/useSliceBlueprint'
import type { BlueprintData } from '@/types/blueprint'
import type { Slice, Slide } from '@/types/database'

const SLICE_ID = 'slice-stage'

vi.mock('@/contexts/viewStateStore', () => ({
  useViewState: () => ({
    openTab: () => {},
    reportPresentSlide: () => {},
    restoredSlide: null,
    consumeRestoredSlide: () => {},
  }),
}))

const slice: Slice = {
  id: SLICE_ID,
  title: 'Stage readout',
  kind: 'journey',
  actor: null,
  created_at: '2026-01-01T00:00:00Z',
  created_by: null,
  summary: null,
  locale: 'en',
  authorship: 'human',
  position: 0,
  service_id: 'svc-1',
  updated_at: '2026-01-01T00:00:00Z',
}

const CELL_COUNT = 9

const blueprint = {
  path: {
    id: 'p-1',
    name: 'Happy',
    summary: null,
    note: null,
    kind: 'happy',
    status: 'live',
  },
  lanes: [{ id: 'l-1', name: 'Lane', role: null, position: 0 }],
  steps: Array.from({ length: CELL_COUNT + 1 }, (_, index) => ({
    id: `st-${index}`,
    name: `Step ${index}`,
    position: index,
  })),
  cells: [
    ...Array.from({ length: CELL_COUNT }, (_, index) => ({
      id: `cell-${index}`,
      lane_id: 'l-1',
      step_id: `st-${index}`,
      content: `Moment ${index}`,
      frame: `https://images.example/frame-${index}.png`,
      summary: null,
    })),
    {
      id: 'cell-bare',
      lane_id: 'l-1',
      step_id: `st-${CELL_COUNT}`,
      content: 'A moment with no picture',
      frame: null,
      summary: null,
    },
  ],
  dependencies: [],
} as BlueprintData

/**
 * A slide citing the first `images` framed cells, plus any extra ids.
 *
 * @param images - how many framed cells the slide cites
 * @param extra - further cited cell ids, framed or not
 */
function slideWith(images: number, extra: string[] = []): Slide {
  return {
    id: `slide-${images}-${extra.length}`,
    title: 'The lobby',
    cell_ids: [
      ...Array.from({ length: images }, (_, index) => `cell-${index}`),
      ...extra,
    ],
    cell_keys: [],
    created_at: '2026-01-01T00:00:00Z',
    created_by: null,
    caption: 'The guest walks in.',
    position: 0,
    shows_all_images: true,
    slice_id: SLICE_ID,
    updated_at: '2026-01-01T00:00:00Z',
  }
}

let current: SliceBlueprint

vi.mock('@/hooks/useSliceBlueprint', () => ({
  useSliceBlueprint: () => current,
}))

import { SlicePresentation } from '@/components/editor/SlicePresentation'

/**
 * Render the stage on one slide.
 *
 * @param slide - the only slide in the slice
 */
function renderSlide(slide: Slide) {
  current = {
    result: {
      status: 'ready',
      data: { slice, items: [slide] },
      source: 'fallback',
    },
    detail: { slice, items: [slide] },
    items: [slide],
    cellIds: slide.cell_ids,
    scenarioResult: { status: 'ready', data: 'scenario-1', source: 'fallback' },
    scenarioId: 'scenario-1',
    blueprint,
    blueprintsLoading: false,
  }
  return render(<SlicePresentation sliceId={SLICE_ID} onReturn={() => {}} />)
}

/** The frames grid on the rendered stage. */
function framesGrid(container: HTMLElement): HTMLElement {
  const grid = container.querySelector<HTMLElement>('[data-presentation-frames]')
  expect(grid).not.toBeNull()
  return grid!
}

/**
 * Pretend an image finished loading at a natural size.
 *
 * @param image - the stage image
 * @param width - natural width in pixels
 * @param height - natural height in pixels
 */
function loadAt(image: HTMLImageElement, width: number, height: number) {
  Object.defineProperty(image, 'naturalWidth', { value: width, configurable: true })
  Object.defineProperty(image, 'naturalHeight', { value: height, configurable: true })
  fireEvent.load(image)
}

afterEach(cleanup)

describe('image frames on the stage', () => {
  it('draws every frame identically, whatever the images measure', () => {
    const { container } = renderSlide(slideWith(3))
    const frames = [
      ...framesGrid(container).querySelectorAll<HTMLElement>(
        'button[aria-label="Enlarge image"]',
      ),
    ]
    expect(frames).toHaveLength(3)
    const images = frames.map((frame) => frame.querySelector('img')!)
    loadAt(images[0]!, 1600, 400)
    loadAt(images[1]!, 120, 900)
    loadAt(images[2]!, 300, 225)

    const frameClass = frames[0]!.className
    expect(frameClass).toMatch(/\baspect-\[4\/3\]/)
    for (const frame of frames) {
      expect(frame.className).toBe(frameClass)
      expect(frame.getAttribute('style')).toBeNull()
    }
    for (const image of images) {
      expect(image.className).toMatch(/\bh-full\b/)
      expect(image.className).toMatch(/\bw-full\b/)
      expect(image.className).toMatch(/\bobject-contain\b/)
    }
  })

  it('never draws an image above twice its natural size', () => {
    const { container } = renderSlide(slideWith(1))
    const image = framesGrid(container).querySelector('img')!
    loadAt(image, 150, 90)
    expect(image.style.maxWidth).toBe('300px')
    expect(image.style.maxHeight).toBe('180px')
  })

  it.each([
    [1, 'grid-cols-1', true],
    [2, 'grid-cols-2', false],
    [3, 'grid-cols-3', false],
    [4, 'grid-cols-4', false],
    [6, 'grid-cols-4', false],
    [9, 'grid-cols-4', false],
  ])('lays %i images out as %s', (count, columns, twoThirds) => {
    const { container } = renderSlide(slideWith(count))
    const grid = framesGrid(container)
    expect(grid.className).toMatch(new RegExp(`\\b${columns}\\b`))
    expect(grid.querySelectorAll('img')).toHaveLength(count)
    expect(/\bw-2\/3\b/.test(grid.className)).toBe(twoThirds)
  })

  it('draws no frames on a slide without pictures', () => {
    const { container } = renderSlide(slideWith(0, ['cell-bare']))
    expect(container.querySelector('[data-presentation-frames]')).toBeNull()
  })
})

describe('the stage type', () => {
  it('sets the counter in sentence case, mono, without uppercase', () => {
    renderSlide(slideWith(2))
    const counter = screen.getByText('Slide 1 of 1')
    for (const token of [
      'font-mono',
      'text-sm',
      'font-medium',
      'text-foreground',
      'tabular-nums',
    ]) {
      expect(counter.className.split(/\s+/)).toContain(token)
    }
    expect(counter.className).not.toMatch(/\buppercase\b|\btracking-/)
  })

  it('gives a slide without pictures the same title and caption as one with', () => {
    renderSlide(slideWith(2))
    const withTitle = screen.getByRole('heading', { name: 'The lobby' }).className
    const withCaption = screen.getByText('The guest walks in.').className
    cleanup()

    renderSlide(slideWith(0, ['cell-bare']))
    const withoutTitle = screen.getByRole('heading', { name: 'The lobby' }).className
    const withoutCaption = screen.getByText('The guest walks in.').className

    expect(withoutTitle).toBe(withTitle)
    expect(withoutCaption).toBe(withCaption)
    expect(withTitle).toMatch(/\btext-2xl\b/)
    expect(withCaption).toMatch(/\btext-sm\b/)
  })

  it('orders counter, title, caption, frames, cells button down the column', () => {
    const { container } = renderSlide(slideWith(2))
    const sequence = [
      screen.getByText('Slide 1 of 1'),
      screen.getByRole('heading', { name: 'The lobby' }),
      screen.getByText('The guest walks in.'),
      framesGrid(container),
      screen.getByRole('button', { name: '2 cells' }),
    ]
    for (let index = 1; index < sequence.length; index += 1) {
      const order = sequence[index - 1]!.compareDocumentPosition(sequence[index]!)
      expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('pluralises the cells button', () => {
    renderSlide(slideWith(0, ['cell-bare']))
    expect(screen.getByRole('button', { name: '1 cell' })).toBeDefined()
  })
})

describe('the filmstrip', () => {
  it('starts on the column edge rather than centring itself', () => {
    const first = slideWith(1)
    const second = { ...slideWith(2), id: 'slide-second' }
    current = {
      result: {
        status: 'ready',
        data: { slice, items: [first, second] },
        source: 'fallback',
      },
      detail: { slice, items: [first, second] },
      items: [first, second],
      cellIds: second.cell_ids,
      scenarioResult: { status: 'ready', data: 'scenario-1', source: 'fallback' },
      scenarioId: 'scenario-1',
      blueprint,
      blueprintsLoading: false,
    }
    const { container } = render(
      <SlicePresentation sliceId={SLICE_ID} onReturn={() => {}} />,
    )
    const strip = container.querySelector('[data-presentation-filmstrip]')!
    const row = strip.firstElementChild as HTMLElement
    const column = container.querySelector<HTMLElement>('[data-presentation-column]')!
    expect(row.className).not.toMatch(/\bw-max\b/)
    const width = (el: HTMLElement) =>
      el.className.split(/\s+/).find((token) => token.startsWith('max-w-'))
    expect(width(row)).toBeDefined()
    expect(width(row)).toBe(width(column))
  })
})
