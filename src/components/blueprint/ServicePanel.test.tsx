// @vitest-environment jsdom
/**
 * The Service panel is the one home the six examples are authored in (#302).
 *
 * Path has no detail panel of its own, so all six live here — one labelled
 * input per kind under an "Examples" section. What is asserted is what an
 * author reaches: the section is present, every kind has its own input, a
 * written example shows in it, and a reader sees the same values as prose.
 */
import type { ReactElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: {}, canWrite: true, configured: true }),
}))

const SERVICE = {
  id: 'svc-1',
  name: 'Home Retrofit',
  summary: 'We insulate homes.',
  funding: '',
  pricing: '',
  deliveryCost: '',
  revenueModel: '',
  partners: '',
  entityExamples: {
    service: 'The whole retrofit, survey to sign-off',
    phase: 'Survey visit',
    scenario: 'A leaky loft',
    path: 'The straightforward install',
    step: 'Book the survey',
    lane: 'The installer',
  },
  phaseCount: 6,
  scenarioCount: 12,
}

vi.mock('@/hooks/useServiceSpec', () => ({
  useServiceSpec: () => ({ status: 'ready', data: SERVICE }),
}))

import { ServicePanel } from '@/components/blueprint/ServicePanel'
import { Drawer } from '@/components/ui/drawer'
import { CanvasModeContext } from '@/contexts/canvasModeContext'
import { ENTITY_KIND_DEFINITIONS, ENTITY_KIND_ORDER } from '@/lib/panelTerms'

afterEach(cleanup)

// The panel header renders a `DrawerTitle`, which needs its dialog root — the
// drawer the panel always opens inside. The mode context gates whether the
// inputs are editable.
function inMode(mode: 'view' | 'design', node: ReactElement) {
  return render(
    <CanvasModeContext.Provider
      value={{ mode, setMode: () => {}, available: true }}
    >
      <Drawer open>{node}</Drawer>
    </CanvasModeContext.Provider>,
  )
}

describe('the Service panel authors the six examples', () => {
  it('has an Examples section, one input per kind, each carrying its value', () => {
    inMode('design', <ServicePanel onClose={() => {}} />)

    expect(screen.getByText('Examples')).toBeDefined()

    // Every kind's own input, filled with its own example. An editable panel
    // shows the value as the textarea's display value.
    for (const kind of ENTITY_KIND_ORDER) {
      expect(
        screen.getByDisplayValue(SERVICE.entityExamples[kind]),
      ).toBeDefined()
    }

    // The input labels are the kind names — the label a reader reads beside
    // each example.
    for (const kind of ENTITY_KIND_ORDER) {
      expect(
        screen.getAllByText(ENTITY_KIND_DEFINITIONS[kind].label).length,
      ).toBeGreaterThan(0)
    }
  })

  it('shows a reader the examples as prose, not as inputs', () => {
    inMode('view', <ServicePanel onClose={() => {}} />)

    expect(screen.getByText('Examples')).toBeDefined()
    // No textarea holds an example — the reader gets the written text.
    for (const kind of ENTITY_KIND_ORDER) {
      expect(screen.queryByDisplayValue(SERVICE.entityExamples[kind])).toBeNull()
      expect(screen.getByText(SERVICE.entityExamples[kind])).toBeDefined()
    }
  })
})
