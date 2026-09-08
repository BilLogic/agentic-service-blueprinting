import { useEffect, useRef } from 'react'
import { useSelectedScenarioIdOptional } from '@/contexts/EditorContext'
import { usePathSelectionContext } from '@/contexts/PathSelectionContext'
import { isScenarioSwitch } from '@/lib/pathCatalogSelection'

/**
 * Moving between scenarios collapses a multi-path comparison back to the
 * default.
 *
 * Path selection is identity-keyed and global, so a comparison built inside
 * one scenario (three paths, Merged view) follows the reader into the next
 * scenario — which then opens as a comparison nobody asked for there. The
 * comparison was a statement about the scenario it was built in, not a
 * standing preference.
 *
 * Only a scenario-to-scenario move resets. Entering the first scenario from
 * the overview keeps whatever filter was set there — an overview selection is
 * a filter, and focusing is not a reason to lose it — and a deep-link seed
 * lands as a first entry (null -> id) for the same reason. The collapse is a
 * no-op when the selection is already the default, so ordinary happy-path
 * navigation never churns downstream state.
 *
 * A bridge component rather than logic inside PathSelectionProvider: the
 * provider module stays free of EditorContext (whose module graph reaches the
 * Supabase client), which keeps the pure selection helpers importable from
 * node-environment tests.
 */
export function ScenarioPathSelectionReset() {
  const selectedScenarioId = useSelectedScenarioIdOptional()
  const { restoreDefaultPathKeys } = usePathSelectionContext()
  const previousScenarioIdRef = useRef(selectedScenarioId)

  useEffect(() => {
    const previous = previousScenarioIdRef.current
    previousScenarioIdRef.current = selectedScenarioId
    if (!isScenarioSwitch(previous, selectedScenarioId)) return
    restoreDefaultPathKeys()
  }, [selectedScenarioId, restoreDefaultPathKeys])

  return null
}
