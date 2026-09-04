/**
 * The deployment seam.
 *
 * This template stands alone, and it also mounts inside a larger host: an
 * external deployment renders this package's `App` and skins it through a
 * typed `DeploymentConfig` rather than by forking the tree. Every field here
 * is optional — a config is a sparse overlay, and an absent section falls
 * back to the template's own defaults, so the standalone build reads exactly
 * as it does with no config at all.
 *
 * Secrets are NOT config. The Supabase URL and anon key stay in the
 * environment (`VITE_SUPABASE_*`), read by `src/config.ts` and the Supabase
 * provider — never threaded through this object. A `DeploymentConfig` is
 * branding, copy, and (reserved) agent surface: values safe to hold in source
 * and to render. Per ADR 0013, the deployment supplies environment for the
 * secrets and config for the skin; the two never mix.
 */
import { ORG_NAME } from './config'

/**
 * The overlay an external deployment supplies. Sparse by construction: every
 * section and every field is optional, and what is left out is inherited from
 * `asbDefaultConfig`.
 */
export type DeploymentConfig = {
  /** Product identity shown in app chrome. `name` is the wordmark seam. */
  brand?: {
    name?: string
    /** Public path or data URI for a logomark. Unused by the mount spike. */
    logo?: string
    /** Accent color token. Unused by the mount spike. */
    accent?: string
  }
  /** User-facing copy a deployment overrides without touching a renderer. */
  content?: {
    workspaceTitle?: string
    coverTitle?: string
  }
  /**
   * RESERVED. Per ADR 0015 the in-app agent is a configurable surface — its
   * doctrine (system-prompt overlay) and the tools it may call are set by the
   * deployment, not hardcoded. The fields are declared here so the shape is
   * stable, but the mount spike neither reads nor honors them: later #331
   * slices wire `doctrine` into the agent's prompt assembly and `enabledTools`
   * into its tool registry. Present and unused, on purpose.
   */
  agent?: {
    doctrine?: string
    enabledTools?: string[]
  }
}

/**
 * The resolved shape every consumer reads: the deployment's overlay merged
 * over the template defaults. `brand.name` is guaranteed a string because the
 * default supplies it; everything else stays optional.
 */
export type ResolvedDeploymentConfig = {
  brand: {
    name: string
    logo?: string
    accent?: string
  }
  content?: {
    workspaceTitle?: string
    coverTitle?: string
  }
  agent?: {
    doctrine?: string
    enabledTools?: string[]
  }
}

/**
 * The template's own config. Standalone, the app runs on exactly this: the
 * brand name IS `ORG_NAME`, so a consumer that reads `brand.name` renders the
 * same wordmark whether or not any deployment config was supplied.
 */
export const asbDefaultConfig: DeploymentConfig = {
  brand: { name: ORG_NAME },
}

/** Merge one flat section (over wins field-by-field); arrays are replaced. */
function mergeSection<T extends object>(
  base: T | undefined,
  over: T | undefined,
): T | undefined {
  if (base === undefined) return over
  if (over === undefined) return base
  return { ...base, ...over }
}

/**
 * Resolve a deployment's overlay against the template defaults. A deep merge
 * one level into each section, so a deployment can set `brand.logo` without
 * having to restate `brand.name`. `null`/absent config resolves to the
 * defaults unchanged.
 */
export function resolveDeploymentConfig(
  config?: DeploymentConfig,
): ResolvedDeploymentConfig {
  const brand = {
    ...asbDefaultConfig.brand,
    ...config?.brand,
    // The one guaranteed field: default name unless the deployment names one.
    name: config?.brand?.name ?? asbDefaultConfig.brand?.name ?? ORG_NAME,
  }
  const content = mergeSection(asbDefaultConfig.content, config?.content)
  const agent = mergeSection(asbDefaultConfig.agent, config?.agent)

  return {
    brand,
    ...(content ? { content } : {}),
    ...(agent ? { agent } : {}),
  }
}
