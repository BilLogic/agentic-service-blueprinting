import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import {
  resolveDeploymentConfig,
  type DeploymentConfig,
  type ResolvedDeploymentConfig,
} from '@/deploymentConfig'

/**
 * The deployment seam, made reachable to every surface in the app.
 *
 * `App` takes a raw `DeploymentConfig` (or none), this provider resolves it
 * once against the template defaults, and the tree below reads the resolved
 * value by hook rather than threading it through props. Standalone, no config
 * is passed and the resolved value is the template's own — so the app renders
 * identically to how it did before the seam existed.
 *
 * The context defaults to `null` and the hook throws outside a provider,
 * matching the house convention (see `PathSelectionContext`): the config is
 * app-wide infrastructure, so a reader mounted outside the provider is a wiring
 * mistake, not a degraded state to paper over.
 */
const DeploymentConfigContext = createContext<ResolvedDeploymentConfig | null>(
  null,
)

export function DeploymentConfigProvider({
  config,
  children,
}: {
  config?: DeploymentConfig | null
  children: ReactNode
}) {
  // Resolve once per distinct config OBJECT. Standalone this is a stable
  // `undefined`, so the resolved value never churns. A host should pass a
  // module-level config rather than an inline literal: a literal is a new
  // object every render, the memo misses, and every reader re-renders.
  const resolved = useMemo(() => resolveDeploymentConfig(config), [config])

  return (
    <DeploymentConfigContext.Provider value={resolved}>
      {children}
    </DeploymentConfigContext.Provider>
  )
}

/** The resolved deployment config for the current app. Throws outside a provider. */
export function useDeploymentConfig(): ResolvedDeploymentConfig {
  const context = useContext(DeploymentConfigContext)
  if (!context) {
    throw new Error(
      'useDeploymentConfig must be used within DeploymentConfigProvider',
    )
  }
  return context
}
