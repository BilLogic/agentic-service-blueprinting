import { useSyncExternalStore } from 'react'
import {
  getTouchpointToneResolver,
  subscribeTouchpointRegistry,
  type TouchpointToneResolver,
} from '@/lib/touchpointColors'

/**
 * `getTouchpointTone`, bound to the registry so a component re-renders when
 * the deployment's colours arrive.
 *
 * `getTouchpointTone` reads a module store, and a module store is invisible to
 * React: a cell that called it directly would draw whatever the store held at
 * its first render and never hear that the rows had landed. This is the
 * subscription that makes it hear.
 *
 * It hands back a FUNCTION rather than one tone, for two reasons. A component
 * with several labels — the compare grid's two sides, the panel's dependency
 * lists — pays for one subscription instead of one per label. And a component
 * whose label is derived past an early return can still take the hook at the
 * top, where the rules of hooks require it, and ask its question later.
 */
export function useTouchpointToneResolver(): TouchpointToneResolver {
  return useSyncExternalStore(
    subscribeTouchpointRegistry,
    getTouchpointToneResolver,
    getTouchpointToneResolver,
  )
}
