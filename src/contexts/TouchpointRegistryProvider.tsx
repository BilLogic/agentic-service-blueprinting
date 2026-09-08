import { useEffect, type ReactNode } from 'react'
import { useTouchpointRegistryTones } from '@/hooks/useTouchpointRegistryTones'
import { setTouchpointRegistry } from '@/lib/touchpointColors'

/**
 * Reads the touchpoint registry once and publishes it to the tone store.
 *
 * Mounted high enough to cover the canvas, the compare grid and the detail
 * panel, the way `EntityExamplesProvider` covers every definition popover.
 *
 * It provides no context, and that is the point rather than an oversight. The
 * component that has to answer "what colour is this touchpoint" is
 * `TouchpointCellFace`, which takes a label and nothing else, and which is
 * held identical in this template and in the deployments built on it. A
 * context value cannot reach it without forking it. So the values go to the
 * module store in `touchpointColors.ts` — the second condition of the
 * decision that cross-surface state is a module store, state non-React code
 * must read — and the cells subscribe to that store through
 * `useTouchpointToneResolver`, which is what re-renders them when this
 * publishes.
 *
 * While the read is in flight nothing is published, so a board opens in the
 * seed's colours and repaints once if the rows disagree. That is the right way
 * round: the seed is a defensible guess for the tools any service uses, and
 * the rows are the deployment's own answer, so the answer wins when it lands
 * rather than being waited for.
 */
export function TouchpointRegistryProvider({
  children,
}: {
  children: ReactNode
}) {
  const result = useTouchpointRegistryTones()
  // An EMPTY catalog is not an answer about colour, it is the absence of one,
  // and it gets the same treatment as no database at all: publishing it would
  // clear whatever a deployment had already installed for its offline boards.
  const entries =
    result.status === 'ready' && result.data.length > 0 ? result.data : null

  // In an effect, not the render body: publishing is a write to shared state,
  // and a concurrent render that React throws away must not leave a pass
  // nobody committed installed. `entries` is referentially stable per query
  // result, so this runs once per answer, and `setTouchpointRegistry` is a
  // no-op when the rows say what the store already holds.
  useEffect(() => {
    if (entries) setTouchpointRegistry(entries)
  }, [entries])

  return <>{children}</>
}
