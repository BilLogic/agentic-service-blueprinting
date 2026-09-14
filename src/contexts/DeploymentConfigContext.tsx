import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  resolveDeploymentConfig,
  type DeploymentConfig,
  type ResolvedDeploymentConfig,
} from '@/deploymentConfig'
import { ORG_NAME } from '@/config'
import type { CoverContent } from '@/components/cover/coverModel'
import {
  configureSampleBlueprints,
  type SampleBlueprintRegistry,
  type SampleBlueprintRegistryLoader,
} from '@/data/blueprintFallbacks'
import { isBundledSampleActive } from '@/lib/bundledSample'
import { applyBrandAccent } from '@/lib/brandAccent'
import { configureCellBudget } from '@/lib/cellContentLimits'
import { configureAgentSearch } from '@/lib/agent/searchPlan'
import { configureAgentTools } from '@/lib/agent/tools/roster'
import { configureAgentReferences } from '@/lib/agent/tools/references'
import { configureAgentDoctrine } from '@/lib/agent/doctrine'
import { configurePathColorPins } from '@/lib/pathColorTheme'
import { configureStoryboardBorders } from '@/lib/storyboardWalkthrough'

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

/**
 * The offline board, in hand: the registry `sample.blueprints` carries, or the
 * one its loader fetches, with the two states a fetch adds.
 *
 * Here rather than inline in the provider because the provider is otherwise a
 * flat list of "write this settled field onto the module that serves it", and
 * this one field needs a fetch, two pieces of state and a gate. Not in
 * `src/hooks/` either: nothing but this provider may call it, since calling it
 * twice would fetch twice and the write it feeds is a module write.
 */
function useSampleBlueprintRegistry(
  supplied: SampleBlueprintRegistry | SampleBlueprintRegistryLoader,
): {
  /** The registry to write, or `null` while a loader is still answering. */
  blueprints: SampleBlueprintRegistry | null
  /** A loader is outstanding: nothing below may render yet. */
  awaiting: boolean
  /** A loader rejected. The caller throws it. */
  failure: Error | null
} {
  const eager = typeof supplied === 'function' ? null : supplied
  const loader = typeof supplied === 'function' ? supplied : null

  /**
   * The loader is called on ONE condition, and it is the same condition every
   * reader of the registry is already behind: is the bundled sample reachable
   * at all? With a database configured it is not — the board draws rows, the
   * slices resolve against reads, and nothing below asks this module anything
   * — so fetching a board nobody will look at is precisely the cost the loader
   * form exists to avoid. Read during render rather than inside the effect, so
   * the fetch and the gate agree in the same pass.
   */
  const active = loader && isBundledSampleActive() ? loader : null

  /**
   * Both states are kept WITH the loader that produced them, and compared by
   * identity below. A host that swapped its config for one carrying a
   * different board would otherwise draw the first board under the second
   * config until the second arrived — and a host that swapped a broken loader
   * for a working one would keep throwing the first one's error forever.
   * `App` is meant to be handed a module-level config, so neither swap is a
   * shape this repository encourages; they are cheap to be correct about and
   * expensive to debug.
   */
  const [answer, setAnswer] = useState<{
    loader: SampleBlueprintRegistryLoader
    registry: SampleBlueprintRegistry
  } | null>(null)
  const [failed, setFailed] = useState<{
    loader: SampleBlueprintRegistryLoader
    error: Error
  } | null>(null)

  useEffect(() => {
    if (!active) return
    let live = true
    active().then(
      (registry) => {
        if (live) setAnswer({ loader: active, registry })
      },
      (cause: unknown) => {
        if (live) {
          setFailed({
            loader: active,
            error: cause instanceof Error ? cause : new Error(String(cause)),
          })
        }
      },
    )
    return () => {
      live = false
    }
  }, [active])

  const loaded = answer && answer.loader === active ? answer.registry : null

  return {
    blueprints: eager ?? loaded,
    awaiting: active !== null && loaded === null,
    failure: failed && failed.loader === active ? failed.error : null,
  }
}

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
   * The offline board's CONTENT onto the fallback module, WHILE THIS RENDERS
   * — the one config field that cannot wait for an effect, not even a layout
   * one.
   *
   * Every other field below is written after the tree below has rendered,
   * which is soon enough because each of them is read later still: a colour
   * before the browser paints, a budget under a field somebody types in, a
   * tool roster assembled when a message is sent. This one is read DURING
   * that render — the board asks `getBlueprintFallback` for its lanes and
   * cells as it draws them — and a module write re-renders nobody. Written in
   * an effect it would land after a keyless board had already drawn the
   * package's content, or nothing, with no second render to correct it.
   *
   * A write during render is legitimate here for the same reason it is
   * unusual: it is idempotent, it touches no React state, and it is a parent
   * settling a module the children below it read. Inside the memo, so it
   * happens once per distinct config object rather than on every render.
   */
  const { blueprints, awaiting, failure } = useSampleBlueprintRegistry(
    resolved.sample.blueprints,
  )
  useMemo(() => {
    configureSampleBlueprints(blueprints ?? undefined)
  }, [blueprints])

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

  /**
   * The pin table onto the colour theme, as a LAYOUT effect for the same
   * reason as the accent: the map is in force before the first paint, so a
   * named path cannot flash the hash colour and then jump. Empty (the template
   * default) writes an empty table, which is today's assignment.
   */
  const pathColorPins = resolved.pathColorPins
  useLayoutEffect(() => {
    configurePathColorPins(pathColorPins)
  }, [pathColorPins])

  /**
   * The cell budget onto the length-guidance module, as a LAYOUT effect for
   * the same reason as the pins: the numbers are in force before the first
   * paint, so the person under the field and the agent in the tool result
   * cannot briefly see the template cap and then jump.
   */
  const cellBudget = resolved.cellBudget
  useLayoutEffect(() => {
    configureCellBudget(cellBudget)
  }, [cellBudget])

  /**
   * The deployment's bordered artwork onto the walkthrough module, as a
   * LAYOUT effect for the same reason as the pins: the list decides whether a
   * frame is drawn with a border around it, so a late write would show every
   * frame double-bordered for one frame and then correct itself. Empty — the
   * template, and every deployment whose artwork carries no border of its own
   * — is today's behaviour, written explicitly rather than left to whatever a
   * previous mount put there.
   */
  const embeddedBorderPaths = resolved.storyboard.embeddedBorderPaths
  useLayoutEffect(() => {
    configureStoryboardBorders(embeddedBorderPaths)
  }, [embeddedBorderPaths])

  /**
   * The search state onto the agent's plan module. An ORDINARY effect, not a
   * layout one: nothing painted depends on it, and the first thing that reads
   * it is a tool roster assembled when someone sends a message. Absent —
   * which is every deployment that has not built ranked search, and the
   * template itself — configures the off state explicitly rather than
   * leaving whatever a previous mount left behind.
   */
  const agentSearch = resolved.agent?.search
  useEffect(() => {
    configureAgentSearch(agentSearch)
  }, [agentSearch])

  /**
   * The tool allowlist onto the roster module, on the same terms: read when
   * a roster is assembled, so an ordinary effect. Absent — the template and
   * every deployment that has not narrowed the agent — is every tool.
   */
  const agentEnabledTools = resolved.agent?.enabledTools
  useEffect(() => {
    configureAgentTools(agentEnabledTools)
  }, [agentEnabledTools])

  /**
   * The deployment's reference documents and doctrine onto the modules that
   * serve them — read when a document is served or a prompt is built, so
   * ordinary effects. Absent is the template's own rulebook and prompt.
   */
  const agentReferences = resolved.agent?.references
  useEffect(() => {
    configureAgentReferences(agentReferences)
  }, [agentReferences])
  const agentDoctrine = resolved.agent?.doctrine
  useEffect(() => {
    configureAgentDoctrine(agentDoctrine)
  }, [agentDoctrine])

  /**
   * Nothing renders until a loader has answered.
   *
   * The render-time write at the top of this component is why: the board
   * reads the fallback module DURING its own render, and a write to that
   * module notifies nobody. Letting the tree draw first and writing the
   * registry when it arrived would put a board on screen with nothing behind
   * it — a deployment's nav rows over an empty canvas, which is the exact
   * failure `sample.blueprints` was added to fix — and the hook that built
   * those empty maps memoizes them on its scenario ids, so no later render
   * corrects it. A gate here is the smallest thing that is true: the
   * eager form passes it in the same tick and renders as it always did, and
   * the loader form holds one chunk fetch before the first paint. Through that
   * one frame the fallback module holds the package's own registry, because
   * there is nothing yet to write — nothing renders to read it, which is what
   * the gate is for.
   *
   * The alternative considered and rejected was to make the fallback module a
   * subscribable store, read through `useSyncExternalStore`, so a write
   * NOTIFIED its readers and the shell could stay up while the board filled
   * in. That is the shape this repository reaches for when state must outlive
   * a mount point or be read where no hook is available — but the
   * registry is not state, it is a content document settled once per
   * installation, and turning every offline lookup into a subscription to buy
   * one chunk fetch of shell would be a store built for the loading screen it
   * saves. The gate costs a blank frame in one build; the store costs the read
   * path forever.
   *
   * A loader that REJECTS throws rather than falling back to the package's
   * own. The package's board is keyed by this template's identifiers and
   * answers a deployment nothing, so the fallback would be a deployment's
   * chrome around a blank canvas with no error anywhere — the silent version
   * of the failure. WHERE THE THROW LANDS IS THE HOST'S: this provider is the
   * outermost element `App` renders, and the editor's boundary is inside it,
   * so nothing in this package catches it — the page comes up blank with the
   * error in the console, which is what the render walk fails on and what a
   * person reads. A host that wants a rendered message puts its own boundary
   * above `App`.
   */
  if (failure) throw failure
  if (awaiting) return null

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
 * The cover this installation lands on — the deployment's own when it supplied
 * one, the template's when it did not. Guaranteed, so the caller renders it
 * with no fallback of its own and names no content module.
 */
export function useCoverContent(): CoverContent {
  return useDeploymentConfig().cover
}

/**
 * The workspace wordmark — what this installation calls itself in app chrome.
 *
 * `content.workspaceTitle ?? cover.title ?? brand.name ?? ORG_NAME`, in that
 * order. The three are not redundant: `brand.name` is the deployment's own
 * name, `content.workspaceTitle` is what the workspace is called inside it —
 * which a deployment whose product name is not its workspace name needs to say
 * separately — and the cover's own `title` is the heading the landing page
 * already shows, which no installation should have to write twice. A
 * deployment that names its cover has named its workspace; one that wants the
 * two to differ says so on `content.workspaceTitle`, which still wins.
 *
 * All of them fall through to the template's `ORG_NAME`, and the template's
 * own cover omits `title` on purpose, so standalone this renders exactly what
 * it rendered before the seam existed.
 *
 * NOT every wordmark surface reads this yet. `types/nav.ts`'s
 * `WORKSPACE_BREADCRUMB_LABEL` is consumed by `slideBreadcrumbs()`, a pure
 * function with no React around it, so it still takes `ORG_NAME` directly;
 * moving it means threading the title into that call, which is its own change.
 */
export function useWorkspaceTitle(): string {
  const { brand, content, cover } = useDeploymentConfig()
  return content?.workspaceTitle ?? cover.title ?? brand.name ?? ORG_NAME
}
