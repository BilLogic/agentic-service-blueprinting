import { useEffect, useRef } from 'react'
import { useSelectedScenarioIdOptional } from '@/contexts/EditorContext'
import {
  isScenarioSwitch,
  usePathSelectionContext,
} from '@/contexts/PathSelectionContext'

/**
 * Moving between scenarios collapses a multi-path comparison back to the
 * happy-path default.
 *
 * Path selection is identity-keyed and global, so a comparison built inside
 * one scenario (three paths, Merged view) used to follow the reader into the
 * next scenario — which then opened as a comparison nobody asked for there.
 * The comparison was a statement about the scenario it was built in, not a
 * standing preference.
 *
 * Only a scenario-to-scenario move resets — see `isScenarioSwitch`. The
 * collapse is a no-op when the selection is already the default, so ordinary
 * happy-path navigation never churns downstream state.
 *
 * A bridge component rather than logic inside PathSelectionProvider: the
 * provider module stays free of EditorContext (whose module graph reaches
 * the Supabase client), which keeps the pure selection helpers importable
 * from node-environment tests.
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
