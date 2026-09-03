import { createContext, useContext, type ReactNode } from 'react'
import { useServiceEntityExamples } from '@/hooks/useServiceEntityExamples'
import type { EntityExamples } from '@/lib/panelTerms'

/**
 * The service's six per-kind examples, made reachable to every definition
 * popover on the board without threading a prop through the whole grid.
 *
 * A definition popover is the single funnel every board label opens its card
 * through — a kind badge, a path badge, a lane or step header. The example that
 * grounds each kind is per-service (one map for the whole deployment), so it
 * rides a context the popover reads by its own `kind` rather than a value
 * plumbed to a dozen scattered call sites. The service read stays in one place;
 * the popovers stay presentational.
 *
 * The default is a FROZEN empty map, not a throw: a popover rendered outside a
 * provider — a unit test, a menu — reads `{}` and shows no example, exactly as
 * a fresh deployment does. That is what keeps the popover safe to render
 * anywhere.
 */
const EMPTY: EntityExamples = Object.freeze({})

/**
 * Exported so a surface with no service query — a unit test, a storybook — can
 * inject a map directly, the way `canvasModeContext` exports its context.
 */
export const EntityExamplesContext = createContext<EntityExamples>(EMPTY)

/** The six per-kind examples for the current service; `{}` outside a provider. */
export function useEntityExamples(): EntityExamples {
  return useContext(EntityExamplesContext)
}

/**
 * Reads the service once and supplies its examples to the tree below.
 *
 * Mounted high enough to cover both the menubar identity headers and the
 * canvas, it shares its cached, constant-keyed query with every other reader,
 * so it costs no extra round-trip. Until the read resolves, and whenever there
 * is no service, the map is empty and no example renders.
 */
export function EntityExamplesProvider({ children }: { children: ReactNode }) {
  const result = useServiceEntityExamples()
  const examples = result.status === 'ready' ? result.data : EMPTY

  return (
    <EntityExamplesContext.Provider value={examples}>
      {children}
    </EntityExamplesContext.Provider>
  )
}
