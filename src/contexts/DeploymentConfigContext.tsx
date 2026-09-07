import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react'
import {
  resolveDeploymentConfig,
  type DeploymentConfig,
  type ResolvedDeploymentConfig,
} from '@/deploymentConfig'
import { ORG_NAME } from '@/config'
import { applyBrandAccent } from '@/lib/brandAccent'

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

  /**
   * `brand.accent` onto the root, as a LAYOUT effect: React runs these after
   * the DOM is mutated and before the browser paints, so the dial is in place
   * for the first frame and no surface flashes the template's hue first.
   *
   * Here rather than in the host's entry file, because the field belongs to
   * the config and a config field whose reader lives outside the thing that
   * takes the config is a field that stops being read the moment that entry
   * moves. A host that wants the dial set even earlier — before React exists
   * at all — can call `applyBrandAccent` itself from its bootstrap; the write
   * is idempotent, so doing both is harmless.
   */
  const accent = resolved.brand.accent
  useLayoutEffect(() => {
    applyBrandAccent(document.documentElement, { accent })
  }, [accent])

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

/**
 * The workspace wordmark — what this installation calls itself in app chrome.
 *
 * `content.workspaceTitle ?? brand.name ?? ORG_NAME`, in that order. The two
 * fields are not redundant: `brand.name` is the deployment's own name and
 * `content.workspaceTitle` is what the workspace is called inside it, which a
 * deployment whose product name is not its workspace name needs to say
 * separately. Both fall through to the template's `ORG_NAME`, so standalone
 * this renders exactly what it rendered before the seam existed.
 *
 * NOT every wordmark surface reads this yet. `types/nav.ts`'s
 * `WORKSPACE_BREADCRUMB_LABEL` is consumed by `slideBreadcrumbs()`, a pure
 * function with no React around it, so it still takes `ORG_NAME` directly;
 * moving it means threading the title into that call, which is its own change.
 */
export function useWorkspaceTitle(): string {
  const { brand, content } = useDeploymentConfig()
  return content?.workspaceTitle ?? brand.name ?? ORG_NAME
}
