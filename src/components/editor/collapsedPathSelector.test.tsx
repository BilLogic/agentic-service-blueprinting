// @vitest-environment jsdom
/**
 * The collapsed floating navbar switches paths on a scenario (#305).
 *
 * Expanded, the path selector lives on the docked phase/scenario bar. Collapse
 * the sidebar and that bar is gone — its identity moves to the floating navbar,
 * and until now the path control moved nowhere, so a reader on a scenario had
 * to expand the sidebar just to change which paths were drawn.
 *
 * The scenario bar now hands its paths over with its title, and the floating
 * navbar mounts the same `PathSelectorMenu` as a trailing control. A phase
 * hands over an empty list, so the selector self-hides there — the control the
 * reader sees is only ever the one that applies.
 *
 * The seam is the floating navbar rendered over the summary store, with the
 * paths published the way a collapsed scenario bar publishes them.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { FloatingSidebarNavbar } from '@/components/editor/EditorChrome'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import {
  setSidebarCollapsedState,
  useCollapsedNavSummary,
} from '@/contexts/sidebarCollapsedContext'

const HAPPY: PathOption = {
  id: 'happy:Happy Path',
  name: 'Happy Path',
  summary: null,
  kind: 'happy',
}
const LATE: PathOption = {
  id: 'variant:Late Join',
  name: 'Late Join',
  summary: null,
  kind: 'variant',
}

/**
 * Publishes a collapsed bar's identity the way `SlideStickyHeader` does when
 * the sidebar is collapsed — a scenario carries its paths, a phase carries an
 * empty list.
 */
function PublishSummary({ paths }: { paths: PathOption[] }) {
  useCollapsedNavSummary({ title: 'Discovery', paths })
  return null
}

function mountFloating(paths: PathOption[]) {
  return render(
    <TooltipProvider>
      <PathSelectionProvider>
        <PublishSummary paths={paths} />
        <FloatingSidebarNavbar onExpand={() => {}} />
      </PathSelectionProvider>
    </TooltipProvider>,
  )
}

const pathSelector = () => screen.queryByLabelText(/^Paths shown/)

afterEach(() => {
  cleanup()
  setSidebarCollapsedState({ collapsed: false })
})

describe('the collapsed floating navbar path selector', () => {
  it('shows the path selector on a scenario', () => {
    mountFloating([HAPPY, LATE])
    expect(pathSelector()).not.toBeNull()
  })

  it('shows nothing on a phase — an empty path list', () => {
    mountFloating([])
    expect(pathSelector()).toBeNull()
  })
})
