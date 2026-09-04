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
 * and to render. The deployment supplies environment for the secrets and
 * config for the skin; the two never mix.
 *
 * This package is consumed as SOURCE — a git install, resolved by a bundler
 * that understands this repo's `@/` alias and Vite's `import.meta.env` and
 * `?raw` — until a built distribution exists. The host also imports the
 * stylesheet, `agentic-service-blueprinting/styles.css`; `App` deliberately
 * does not, so a host owns the one place its CSS is loaded.
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
   * RESERVED. The in-app agent is a configurable surface — its doctrine (a
   * system-prompt overlay) and the tools it may call are set by the
   * deployment, not hardcoded, the same way brand and content are. The fields
   * are declared here so the shape is stable, but nothing reads them yet:
   * later slices wire `doctrine` into the agent's prompt assembly and
   * `enabledTools` into its tool registry. Present and unused, on purpose.
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

/**
 * A section with its `undefined` fields dropped, as a fresh object. Two
 * reasons: an overlay that says `{ workspaceTitle: undefined }` means "I have
 * nothing to say", not "erase the default"; and the resolved config must never
 * alias the host's object or the module default — a later mutation of either
 * would reach into every reader. Arrays are copied for the same reason.
 */
function present<T extends object>(section: T | undefined): Partial<T> {
  const out: Partial<T> = {}
  if (!section) return out
  for (const key of Object.keys(section) as (keyof T)[]) {
    const value = section[key]
    if (value === undefined) continue
    out[key] = (Array.isArray(value) ? [...value] : value) as T[keyof T]
  }
  return out
}

/** Merge one flat section, field by field; `over` wins. Arrays are replaced. */
function mergeSection<T extends object>(
  base: T | undefined,
  over: T | undefined,
): T | undefined {
  if (base === undefined && over === undefined) return undefined
  return { ...present(base), ...present(over) } as T
}

/**
 * Resolve a deployment's overlay against the template defaults. A deep merge
 * one level into each section, so a deployment can set `brand.logo` without
 * having to restate `brand.name`. An absent or `null` config resolves to the
 * defaults unchanged. The result is a fresh object every call.
 */
export function resolveDeploymentConfig(
  config?: DeploymentConfig | null,
): ResolvedDeploymentConfig {
  const brand = {
    ...present(asbDefaultConfig.brand),
    ...present(config?.brand),
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
