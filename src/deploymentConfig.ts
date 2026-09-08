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
 *
 * ── WHAT THIS TYPE DOES NOT COVER ─────────────────────────────────────────
 *
 * Stated here because the header above reads like a complete boundary and is
 * not one, and a seam that overstates its reach is the defect it exists to
 * prevent.
 *
 * WIRED TODAY: the wordmark and the accent. `content.workspaceTitle ??
 * brand.name ?? ORG_NAME` is what app chrome calls this installation, read
 * through `useWorkspaceTitle` by the tab strip and the editor shell; and
 * `brand.accent` is written onto the root's `--hue` by
 * `DeploymentConfigProvider` before the first paint. `brand.logo`,
 * `content.coverTitle` and the whole `agent` block are declared shape with no
 * reader: the cover heading and the workspace breadcrumb still take
 * `coverContent.title` and `ORG_NAME` directly. They migrate onto this type in
 * later slices; until then setting them changes nothing.
 *
 * NOT FIELDS HERE, AND DELIBERATELY: the localStorage namespace, and the
 * agent's extra reference documents. A config is
 * read when `App` RENDERS, and the namespace is settled long before that —
 * six modules build their storage key while the import graph evaluates, and
 * two of them read localStorage there to seed a store snapshot. A field whose
 * value arrives one lifecycle too late would be honoured by nothing and would
 * fail silently, with two installations on one origin sharing a namespace. So
 * a host calls `configureStorageNamespace` from a module it imports before
 * this package, and `lib/storageNamespace.ts` carries the reasoning and the
 * guard that makes a late call throw.
 *
 * The reference documents fail the same test for the same reason. The record
 * the agent serves, the vocabulary that names it, and the `get_reference` tool
 * description that quotes that vocabulary to the model are all built while
 * `referenceDocs.ts`, `referenceNames.ts` and `specs.ts` evaluate. A document
 * handed over at render time would be served by a tool that never mentions it.
 * So a deployment registers its own with `registerReferenceDocs`, from the
 * same pre-import module — `lib/agent/tools/referenceRegistry.ts` carries that
 * reasoning, and `bootstrap.ts` is the entry point both are reached through.
 *
 * Timing is the whole of the argument in both cases: it is not that these
 * values are unimportant, it is that a render-time seam cannot carry an
 * import-time value. Nothing is lost by their being calls — they are typed,
 * they are reviewable at the one place the two repos meet, and getting them
 * wrong throws.
 *
 * NOT A GAP, THOUGH IT LOOKED LIKE ONE: the provider tree. `App` renders a
 * fixed one, and a config object cannot express a provider tree, so the
 * obvious reading is that a deployment with providers of its own needs a
 * composition seam here — a `children` slot, a render prop, a list of
 * providers to interleave. It was checked rather than assumed, and the four
 * providers and components that prompted the question turned out to name no
 * deployment, no deployment's vocabulary, and no table this schema lacks.
 * Every one was a generic behaviour this side was simply missing, and each
 * has now landed here: the slug-to-service resolver, the scenario-switch
 * collapse, the write-failure notice and its store. A seam invented for that
 * difference would have had exactly one user and would have been holding a
 * difference that was not one. If a real fork in the tree ever appears, the
 * argument for a seam has to be made again on its own evidence — this is not
 * a precedent that the tree can never need one, only a finding that it did
 * not need one here. `App.tsx` carries the order the two trees settled on and
 * the reasoning behind each position.
 *
 */
import { BRAND, ORG_NAME } from './config'
import { coverContent } from './content/coverContent'

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
 * The template's own config, and the value every resolution starts from.
 * Standalone the app runs on exactly this, so a consumer that reads
 * `brand.name` renders the same wordmark whether or not a config was supplied.
 *
 * NONE OF THE THREE VALUES IS A LITERAL, and none may become one — that is
 * what makes this constant the only thing a deployment built on this template
 * has to fork, and `config.ts` the only file it has to edit (#230). The
 * workspace title is `coverContent.title`, the one module an installation
 * writes its own copy in, so a name typed here cannot end up on a board it
 * does not describe. The accent is `BRAND.accent`, because `config.ts` is
 * where a deployer writes the colour and `styles/themes/*.css` is where the
 * ramp drawn at that hue is authored; a hex repeated here would be a third
 * place for the three to disagree.
 *
 * Both of those resolve to `undefined` in this repository, and that is the
 * template's honest state rather than an oversight: `coverContent.ts` omits
 * `title` on purpose so the cover heading falls back to `ORG_NAME`, and
 * `BRAND` ships no accent because this kit's `--brand-*` ramp is greyscale.
 * `present()` drops an undefined field, so the resolved brand is unchanged and
 * the wordmark still falls through to `ORG_NAME`; `applyBrandAccent` writes
 * nothing for an absent accent, so the theme files' own dial stands. The one
 * difference a reader could see is that `content` now resolves to an empty
 * section rather than being absent — `mergeSection` returns a section whenever
 * either side names one — and no reader distinguishes those, because every one
 * of them reaches a field through `?.`. `deploymentConfig.test.ts` holds all
 * of it.
 */
export const asbDefaultConfig: DeploymentConfig = {
  brand: { name: ORG_NAME, accent: BRAND.accent },
  content: { workspaceTitle: coverContent.title },
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
