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
 * WIRED TODAY: the wordmark, the accent, the path-colour pins, and the cell
 * budget. `content.workspaceTitle ?? brand.name ?? ORG_NAME` is what app
 * chrome calls this installation, read through `useWorkspaceTitle` by the
 * tab strip and the editor shell; `brand.accent` is written onto the root's
 * `--hue` by `DeploymentConfigProvider` before the first paint;
 * `pathColorPins` is written onto the path-colour theme in the same layout
 * effect, so a deployment's map is in force before the board paints; and
 * `cellBudget` is written onto the length-guidance module in that effect
 * too, so the person under the field and the agent in the tool result read
 * the same thresholds before the first paint. `defaultLanes` is read by the
 * create dialog through `useDeploymentConfig`, and is the lane set a new
 * blueprint starts with when nothing is copied. `brand.logo`,
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
import { SAMPLE_NAV } from '@/data/sampleNav'
import type { LaneSetEntry } from '@/lib/authoringRpc'
import { DEFAULT_LANE_SET } from '@/lib/blueprintValidation'
import type { NavItem } from '@/types/nav'

/**
 * One length budget, in characters: a target and a warning.
 *
 * The two rungs can be the same number — this template's default is, because
 * it used to have a single cap. A deployment that wants a softer first note
 * and a harder second one supplies two different values.
 */
export type CellContentBudgetRung = {
  target: number
  warning: number
}

/**
 * Per-lane-kind cell text budget. Prose cells and touchpoint labels are
 * budgeted separately.
 *
 * A deployment overlay example of the shape (not this template's default):
 * `{ prose: { target: 80, warning: 100 }, touchpointLabels: { target: 32, warning: 48 } }`.
 * Those figures belong on a deployment's config, not in the shared module.
 */
export type CellContentBudget = {
  prose: CellContentBudgetRung
  touchpointLabels: CellContentBudgetRung
}

/**
 * Sparse overlay for {@link CellContentBudget}: either kind, and either rung
 * of a kind, may be omitted and falls through to the template default.
 */
export type CellContentBudgetOverlay = {
  prose?: Partial<CellContentBudgetRung>
  touchpointLabels?: Partial<CellContentBudgetRung>
}

/**
 * One vector index a deployment's database actually holds, named by the
 * provider that built it, the model it was built with, and the size that
 * model was asked for.
 *
 * All three matter and none is decoration. A question's embedding and a
 * cell's embedding can only be compared inside one vector space, and a space
 * is `(model, dimensions)` — so a question embedded by `text-embedding-3-small`
 * at 768 cannot be scored against cells embedded by `gemini-embedding-001` at
 * 768, and the database is expected to refuse the pairing rather than rank it
 * as noise. `provider` is how a browser knows whether the key it holds can
 * even reach the model: a person on a Google key cannot call OpenAI's
 * embedding endpoint, however well the numbers line up.
 *
 * This list states WHAT THE DEPLOYMENT HOLDS. It is not a wish, not a
 * preference order, and not permission to build anything: an entry with no
 * index behind it makes the database raise on every meaning search a person
 * attempts.
 */
export type AgentSearchIndex = {
  provider: 'google' | 'openai'
  /** The embedding model's own name, as the database records it. */
  model: string
  /** The size that model was asked for, matching the index column. */
  dimensions: number
}

/**
 * Whether the in-app agent has ranked search at all, and which vector indexes
 * its database holds.
 *
 * `enabled` is a statement about the DATABASE, not a taste: it says this
 * deployment's schema carries the `search_blueprint` function. The template's
 * own schema does not, which is why the default is `false` and the tool is
 * absent from the agent's roster rather than present and failing.
 *
 * `indexes` is opt-in on top of that. Left out, ranked search runs on the
 * function's keyword and structural arms only. Listed, a person whose own
 * provider matches an entry has their question embedded with their own key
 * and gets meaning matching too — and a person whose provider matches
 * nothing listed is not offered the tool, rather than being handed a keyword
 * consolation dressed as the same search.
 */
export type AgentSearchConfig = {
  enabled?: boolean
  indexes?: AgentSearchIndex[]
}

/** {@link AgentSearchConfig} with both fields settled. */
export type ResolvedAgentSearchConfig = {
  enabled: boolean
  indexes: AgentSearchIndex[]
}

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
   * The in-app agent is a configurable surface — its doctrine (a
   * system-prompt overlay), the tools it may call, and whether its ranked
   * search exists at all are set by the deployment, not hardcoded, the same
   * way brand and content are.
   *
   * `search` IS READ. `doctrine` and `enabledTools` are still declared shape
   * with no reader: later slices wire `doctrine` into the agent's prompt
   * assembly and `enabledTools` into its tool registry. Present and unused,
   * on purpose.
   */
  agent?: {
    doctrine?: string
    enabledTools?: string[]
    search?: AgentSearchConfig
  }
  /**
   * The board a deployment shows before its own data arrives — offline, or
   * while the first fetch is in flight. A deployment's own content, which is
   * why it reaches the template through here rather than being imported by the
   * navigation model: a module of types and pure helpers that carries one
   * repository's phases cannot be shared with the next.
   */
  sample?: {
    nav?: NavItem[]
  }
  /**
   * Path names pinned to a colour/dash slot in the open set, rather than left
   * to the hash. The slot is an index into that set (indigo, purple, gold,
   * yellow) and the matching dash list: colour and dash are both read from it
   * so the pair cannot drift. Names absent from the map keep the ordinary
   * assignment. An omitted or empty map is the template's own behaviour.
   */
  pathColorPins?: Record<string, number>
  /**
   * How much text a cell may carry before the person and the agent are
   * advised. Optional: an omitted budget is the template's current
   * thresholds (120/120 on both kinds). A deployment that wants different
   * numbers supplies them here rather than editing the shared budget module.
   */
  cellBudget?: CellContentBudgetOverlay
  /**
   * The lanes a new blueprint starts with when nothing is copied, top to
   * bottom. A deployment's own vocabulary — the names its boards actually use
   * — which is why it arrives here rather than being written into the shared
   * validation module. Each entry carries a role from the closed lane-role
   * vocabulary, because the dividers are drawn from roles, not names.
   *
   * Replaced, never merged: a supplied list is the whole set. An omitted or
   * EMPTY list is the template's standard set, read the way `sample.nav` is —
   * a blueprint with no lanes is not a default anyone means to supply.
   */
  defaultLanes?: LaneSetEntry[]
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
    /**
     * Settled when the deployment names a search section, absent when it does
     * not — the same sparseness as its two neighbours. An absent section is
     * the template's own state, which `asbDefaultAgentSearch` spells out:
     * search off, nothing listed. Readers go through
     * `configureAgentSearch`, which takes `undefined` and means exactly that.
     */
    search?: ResolvedAgentSearchConfig
  }
  /**
   * Guaranteed non-empty, the way `brand.name` is guaranteed a string: the
   * template's default supplies one, and a deployment that overlays an EMPTY
   * array is saying "I have nothing to say" rather than "show nothing", the
   * same reading `present()` gives an `undefined` field. Readers may index it.
   */
  sample: {
    nav: NavItem[]
  }
  /**
   * Guaranteed a map, the way `sample.nav` is guaranteed an array: the
   * template's default supplies an empty one, and a deployment that overlays
   * pins is adding names, not replacing a vocabulary the template does not have.
   */
  pathColorPins: Record<string, number>
  /**
   * Guaranteed complete, the way `pathColorPins` is guaranteed a map: the
   * template's default supplies both kinds, and a deployment that overlays
   * one kind keeps the other.
   */
  cellBudget: CellContentBudget
  /**
   * Guaranteed non-empty, the way `sample.nav` is: the template's standard set
   * unless the deployment names lanes of its own. Readers may pass it straight
   * to `laneSetFor`.
   */
  defaultLanes: LaneSetEntry[]
}

/**
 * The template's own config, and the value every resolution starts from.
 * Standalone the app runs on exactly this, so a consumer that reads
 * `brand.name` renders the same wordmark whether or not a config was supplied.
 *
 * NONE OF THE THREE VALUES IS A LITERAL, and none may become one — that is
 * what makes this constant the only thing a deployment built on this template
 * has to fork, and `config.ts` the only file it has to edit. The workspace
 * title is `coverContent.title`, the one module an installation writes its
 * own copy in, so a name typed here cannot end up on a board it does not
 * describe. The accent is `BRAND.accent`, because `config.ts` is where a
 * deployer writes the colour and `styles/themes/*.css` is where the ramp
 * drawn at that hue is authored; a hex repeated here would be a third place
 * for the three to disagree.
 *
 * Both of those resolve to `undefined` in this repository, and that is the
 * template's honest state rather than an oversight: `coverContent.ts` omits
 * `title` on purpose so the cover heading falls back to `ORG_NAME`, and
 * `BRAND` ships no accent because this template's `--brand-*` ramp is greyscale.
 * `present()` drops an undefined field, so the resolved brand is unchanged and
 * the wordmark still falls through to `ORG_NAME`; `applyBrandAccent` writes
 * nothing for an absent accent, so the theme files' own dial stands. The one
 * difference a reader could see is that `content` now resolves to an empty
 * section rather than being absent — `mergeSection` returns a section whenever
 * either side names one — and no reader distinguishes those, because every one
 * of them reaches a field through `?.`. `deploymentConfig.test.ts` holds all
 * of it.
 */
/**
 * The template's current single cap, expressed as target and warning per
 * lane kind. 120 is today's geometry (and the old hard stop). A deployment
 * that wants a different pair supplies it on the overlay — do not fork this
 * object for numbers.
 *
 * The prose target is meant to equal what four lines of cell text hold.
 * The cell text rung has moved from 14px to 13px, which fits more; measure
 * against the current rung before changing this number, rather than guessing.
 */
export const asbDefaultCellBudget: CellContentBudget = {
  prose: { target: 120, warning: 120 },
  touchpointLabels: { target: 120, warning: 120 },
}

/**
 * The template's own search state: OFF, with nothing listed.
 *
 * Not a conservative default chosen for taste — the template's schema holds no
 * `search_blueprint` function, so a tool switched on here would be a tool that
 * raises `relation does not exist` on its first call. A deployment whose
 * database does hold it says so on its own config.
 */
export const asbDefaultAgentSearch: ResolvedAgentSearchConfig = {
  enabled: false,
  indexes: [],
}

export const asbDefaultConfig: DeploymentConfig = {
  brand: { name: ORG_NAME, accent: BRAND.accent },
  content: { workspaceTitle: coverContent.title },
  sample: { nav: SAMPLE_NAV },
  pathColorPins: {},
  cellBudget: {
    prose: { ...asbDefaultCellBudget.prose },
    touchpointLabels: { ...asbDefaultCellBudget.touchpointLabels },
  },
  defaultLanes: DEFAULT_LANE_SET,
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
 * Copy one rung. Nested objects are cloned so a later mutation of the host
 * overlay cannot reach into the resolved config.
 */
function copyRung(
  base: CellContentBudgetRung,
  over?: Partial<CellContentBudgetRung>,
): CellContentBudgetRung {
  return {
    target: over?.target ?? base.target,
    warning: over?.warning ?? base.warning,
  }
}

/**
 * Resolve the cell budget: each kind and each rung falls through to
 * {@link asbDefaultCellBudget} when the overlay omits it. The numbers live
 * only on that constant — this copies them, it does not restate them.
 */
function mergeCellBudget(
  over: CellContentBudgetOverlay | undefined,
): CellContentBudget {
  return {
    prose: copyRung(asbDefaultCellBudget.prose, over?.prose),
    touchpointLabels: copyRung(
      asbDefaultCellBudget.touchpointLabels,
      over?.touchpointLabels,
    ),
  }
}

/**
 * Settle a supplied search section, copying it all the way down.
 *
 * `mergeSection` is one level deep and would pass the index array's ENTRIES
 * through by reference, so a host that edited an entry after mount would
 * silently change which model the browser embeds with. Absent stays absent:
 * the template's own state is not a section anyone supplied.
 */
function mergeAgentSearch(
  over: AgentSearchConfig | undefined,
): ResolvedAgentSearchConfig | undefined {
  if (!over) return undefined
  return {
    enabled: over.enabled ?? asbDefaultAgentSearch.enabled,
    indexes: (over.indexes ?? []).map((index) => ({ ...index })),
  }
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
  const mergedAgent = mergeSection(asbDefaultConfig.agent, config?.agent)
  // `mergeSection` is one level deep, so it copied the overlay's own `search`
  // object across by reference. Drop that reference and put the settled deep
  // copy in its place. A host that named no search section leaves the key off
  // entirely, so an untouched `agent` resolves to exactly what it did before
  // this field existed.
  const { search: suppliedSearch, ...agentRest } = mergedAgent ?? {}
  void suppliedSearch
  const search = mergeAgentSearch(config?.agent?.search)
  const agent = mergedAgent
    ? { ...agentRest, ...(search ? { search } : {}) }
    : undefined
  const overlaidNav = config?.sample?.nav
  const sample = {
    nav: [
      ...(overlaidNav?.length ? overlaidNav : (asbDefaultConfig.sample?.nav ?? [])),
    ],
  }
  const pathColorPins = {
    ...present(asbDefaultConfig.pathColorPins),
    ...present(config?.pathColorPins),
  } as Record<string, number>
  const cellBudget = mergeCellBudget(config?.cellBudget)
  // Each entry copied, so a later edit to the host's list cannot reach a
  // blueprint created after it.
  const overlaidLanes = config?.defaultLanes
  const defaultLanes = (
    overlaidLanes?.length ? overlaidLanes : (asbDefaultConfig.defaultLanes ?? [])
  ).map((lane) => ({ ...lane }))

  return {
    brand,
    ...(content ? { content } : {}),
    ...(agent ? { agent } : {}),
    sample,
    pathColorPins,
    cellBudget,
    defaultLanes,
  }
}
