// @vitest-environment jsdom
/**
 * The cover's Services tab.
 *
 * The services tab's body is one page per service. Two services turn the
 * singular "The service" tab into a "Services" tab that heads its panel with
 * the service selector, and the ACTIVE service's own page renders below —
 * switch the active service and the page switches with it. One service (or
 * none) leaves the tab exactly as it was — singular label, no selector row —
 * rendering that sole page. Driven through `CoverPageView`, the provider-free
 * surface the cover's other tests drive, with the roster handed in as props.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { CoverPageView } from '@/components/cover/CoverPage'
import type {
  CoverContent,
  CoverSection,
  CoverServicePage,
} from '@/components/cover/coverModel'
import type { ActiveService } from '@/contexts/ActiveServiceContext'

beforeAll(() => {
  // jsdom has no ResizeObserver; the cover strip's indicator effect needs one.
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

const prose = (id: string, heading: string, body: string): CoverSection => ({
  kind: 'prose',
  id,
  heading,
  paragraphs: [body],
})

/** A deployment whose services tab holds exactly the pages handed in. */
const servicesContent = (pages: CoverServicePage[]): CoverContent => ({
  title: 'Test Workspace',
  lede: 'A lede.',
  primaryCtaLabel: 'Open the blueprint',
  commandCopy: { copyLabel: 'Copy', copiedLabel: 'Copied' },
  states: { noSlices: 'No slices yet.' },
  tabs: [
    {
      value: 'the-service',
      label: 'The service',
      services: { pluralLabel: 'Services', pages },
    },
    {
      value: 'overview',
      label: 'Overview',
      sections: [prose('s2', 'Overview', 'Overview body.')],
    },
  ],
})

// Each page carries a unique body sentinel — distinct from the service NAMES
// the selector renders, so a `getByText` on the copy never collides with a tab.
const SALES_PAGE: CoverServicePage = {
  slug: 'sales-pipeline',
  sections: [prose('p-a', 'Sales Pipeline', 'Sales page copy.')],
}
const SUPPORT_PAGE: CoverServicePage = {
  slug: 'support-desk',
  sections: [prose('p-b', 'Support Desk', 'Support page copy.')],
}

const TWO: ActiveService[] = [
  { id: 'svc-a', name: 'Sales Pipeline', slug: 'sales-pipeline' },
  { id: 'svc-b', name: 'Support Desk', slug: 'support-desk' },
]

/** The selector row, told apart from the cover's own tab strip by its label. */
const selectorRow = () => screen.queryByRole('tablist', { name: 'Services' })

describe('with one service, the tab is its singular self', () => {
  it('reads "The service", shows no selector row, and renders the sole page', () => {
    render(
      <CoverPageView
        content={servicesContent([SALES_PAGE])}
        onOpenCanvas={() => {}}
        services={[TWO[0]]}
        activeServiceSlug="sales-pipeline"
      />,
    )
    expect(screen.getByRole('tab', { name: 'The service' })).toBeDefined()
    expect(screen.queryByRole('tab', { name: 'Services' })).toBeNull()
    expect(selectorRow()).toBeNull()
    expect(screen.getByText('Sales page copy.')).toBeDefined()
  })

  it('is unchanged with no roster handed in at all — the sole page still shows', () => {
    render(
      <CoverPageView
        content={servicesContent([SALES_PAGE])}
        onOpenCanvas={() => {}}
      />,
    )
    expect(screen.getByRole('tab', { name: 'The service' })).toBeDefined()
    expect(selectorRow()).toBeNull()
    // No roster, no active slug: the render falls back to the one page.
    expect(screen.getByText('Sales page copy.')).toBeDefined()
  })
})

describe('with two services, the tab becomes the Services selector', () => {
  const twoPages = () => servicesContent([SALES_PAGE, SUPPORT_PAGE])

  it('pluralizes the tab label', () => {
    render(
      <CoverPageView
        content={twoPages()}
        onOpenCanvas={() => {}}
        services={TWO}
        activeServiceSlug="sales-pipeline"
      />,
    )
    expect(screen.getByRole('tab', { name: 'Services' })).toBeDefined()
    expect(screen.queryByRole('tab', { name: 'The service' })).toBeNull()
  })

  it('heads the panel with a tab per service, the active one selected', () => {
    render(
      <CoverPageView
        content={twoPages()}
        onOpenCanvas={() => {}}
        services={TWO}
        activeServiceSlug="sales-pipeline"
      />,
    )
    const row = selectorRow()
    expect(row).not.toBeNull()
    const active = within(row!).getByRole('tab', { name: 'Sales Pipeline' })
    expect(active.getAttribute('aria-selected')).toBe('true')
    expect(
      within(row!)
        .getByRole('tab', { name: 'Support Desk' })
        .getAttribute('aria-selected'),
    ).toBe('false')
  })

  it('selects a service when its tab is clicked', () => {
    const onSelectService = vi.fn<(slug: string) => void>()
    render(
      <CoverPageView
        content={twoPages()}
        onOpenCanvas={() => {}}
        services={TWO}
        activeServiceSlug="sales-pipeline"
        onSelectService={onSelectService}
      />,
    )
    fireEvent.click(
      within(selectorRow()!).getByRole('tab', { name: 'Support Desk' }),
    )
    expect(onSelectService).toHaveBeenCalledWith('support-desk')
  })

  it('renders the active service’s own page, not the other one', () => {
    render(
      <CoverPageView
        content={twoPages()}
        onOpenCanvas={() => {}}
        services={TWO}
        activeServiceSlug="sales-pipeline"
      />,
    )
    expect(screen.getByText('Sales page copy.')).toBeDefined()
    expect(screen.queryByText('Support page copy.')).toBeNull()
  })

  it('renders the OTHER service’s page when it is the active one', () => {
    render(
      <CoverPageView
        content={twoPages()}
        onOpenCanvas={() => {}}
        services={TWO}
        activeServiceSlug="support-desk"
      />,
    )
    expect(screen.getByText('Support page copy.')).toBeDefined()
    expect(screen.queryByText('Sales page copy.')).toBeNull()
  })

  it('swaps the page when the active service changes', () => {
    const { rerender } = render(
      <CoverPageView
        content={twoPages()}
        onOpenCanvas={() => {}}
        services={TWO}
        activeServiceSlug="sales-pipeline"
      />,
    )
    expect(screen.getByText('Sales page copy.')).toBeDefined()
    rerender(
      <CoverPageView
        content={twoPages()}
        onOpenCanvas={() => {}}
        services={TWO}
        activeServiceSlug="support-desk"
      />,
    )
    expect(screen.getByText('Support page copy.')).toBeDefined()
    expect(screen.queryByText('Sales page copy.')).toBeNull()
  })
})
