import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Fragment, type ComponentType, type ReactNode } from 'react'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'
import { EditorShell } from '@/components/editor/EditorShell'
import { ScenarioPathSelectionReset } from '@/components/editor/ScenarioPathSelectionReset'
import { WriteFailureNotices } from '@/components/editor/WriteFailureNotices'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ActiveServiceProvider } from '@/contexts/ActiveServiceContext'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { BoardAddressSync } from '@/components/editor/BoardAddressSync'
import { EditorProvider } from '@/contexts/EditorContext'
import { EntityExamplesProvider } from '@/contexts/EntityExamplesContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import { TouchpointRegistryProvider } from '@/contexts/TouchpointRegistryProvider'
import { ViewStateProvider } from '@/contexts/ViewStateContext'
import type { DeploymentConfig } from '@/deploymentConfig'
import { queryClient } from '@/lib/queryClient'

/**
 * The app root. Standalone it takes no props and runs on the template
 * defaults; mounted by an external deployment it takes a `DeploymentConfig`
 * that skins the tree from the outermost level down. Both the named export
 * (for a host) and the default export (for `main.tsx`) resolve to this.
 *
 * ── THE ORDER OF THE TREE, AND WHY IT IS THIS ONE ─────────────────────────
 *
 * Written down because it was not obvious, and because two installations had
 * quietly settled on two different orders. Almost none of these providers
 * consume one another — every one of them reads React context from outside
 * this file or from nothing at all — so the tree has very few FORCED edges
 * and a great many arbitrary ones, which is exactly the condition under which
 * an order drifts and nobody notices.
 *
 * The forced edges, all of them:
 *
 *   - `QueryClientProvider` and `SupabaseProvider` above the three reading
 *     providers (active service, entity examples, touchpoint registry).
 *     `useSupabaseQuery` reads both; without either it has no client and no
 *     cache.
 *   - `PathSelectionProvider` above `ScenarioPathSelectionReset`, which throws
 *     outside it, and `EditorProvider` above it too — that read is null-safe,
 *     so out of place it would not throw, it would simply never fire.
 *   - `EditorErrorBoundary` NOT above `WriteFailureNotices`. See its comment
 *     below; this is the one edge in the tree that is a behaviour rather than
 *     a wiring requirement.
 *
 * Everything else is settled by band, outermost to innermost:
 *
 *   1. The DEPLOYMENT SEAM. `DeploymentConfigProvider` is outermost because
 *      every band below may be skinned by it and none of it may be skinned
 *      half way down.
 *   2. INFRASTRUCTURE — the query cache, the theme, the database client.
 *      Nothing here renders anything the reader sees. `sessionOverlay`
 *      closes this band, for the reason set out below.
 *   3. SHARED READS — the active service, then the two session-wide reads
 *      that hang off it. One query each, cached and shared by everything
 *      below, which is the whole reason they are providers rather than hooks
 *      at the call sites.
 *   4. INTERACTION STATE — the editor, the view state, the path selection.
 *      What the reader is looking at and what they have chosen.
 *   5. PRESENTATION — the tooltip delay, then the boundary and the shell.
 *
 * The rule that decides the arbitrary edges is that a band may read the bands
 * outside it and never the ones inside. Read top to bottom, the tree goes from
 * what is true of the whole installation to what is true of this moment on
 * this screen. When something new needs a home, place it in its band; if it
 * belongs to two, it is doing two things.
 *
 * ── THE ONE SEAM AN ENTRY MAY OPEN IN THE MIDDLE OF THE TREE ──────────────
 *
 * `config` skins the tree from OUTSIDE it, which is everything a deployment
 * needs and nothing an installation's own tooling can use: tooling that wants
 * to shadow what the tree believes about the session has to sit UNDER the
 * database client, and no prop passed from an entry can get there by itself.
 * `sessionOverlay` is that one place, and it is deliberately one place: a
 * second component under `SupabaseProvider` and above everything that reads
 * it, supplied by whoever mounted the app and absent by default.
 *
 * What fills it is not this repository's business, and this file names
 * nothing that does. The kit's own `main.tsx` puts its developer portal there
 * behind `import.meta.env.DEV`; a deployment passes nothing and pays a
 * `Fragment`. That asymmetry is the point — the alternative is what this
 * replaced, where the kit's tier simulator was mounted inside the shared
 * editor chrome and every deployment carried the mount.
 */
export function App({
  config,
  sessionOverlay: SessionOverlay = Fragment,
}: {
  config?: DeploymentConfig | null
  sessionOverlay?: ComponentType<{ children: ReactNode }>
}) {
  return (
    <DeploymentConfigProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/*
         * `attribute="class"` matches the token setup: themes/light.css targets
         * `:root, .light`, themes/dark.css targets `.dark`, and the `dark:`
         * variant is `&:where(.dark, .dark *)`. `enableColorScheme` (on by
         * default) also sets `color-scheme` on the root, which is what makes
         * scrollbars and native form controls follow the theme.
         */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SupabaseProvider>
            <SessionOverlay>
              {/*
               * Resolves the URL slug to the active service and canonicalises
               * the slug into the address bar. Above everything that reads a
               * service, so no reader below it can see a stale one.
               */}
              <ActiveServiceProvider>
                {/*
                 * Above the editor so both the menubar identity headers and the
                 * canvas read one cached service query; the definition popovers
                 * on the board pick their per-kind example out of it by kind.
                 */}
                <EntityExamplesProvider>
                  {/*
                   * One unscoped read of `touchpoints.tone` and `.aliases` for
                   * the whole session, published to the module store every
                   * touchpoint face resolves its colour through (#326 S6).
                   */}
                  <TouchpointRegistryProvider>
                    <EditorProvider>
                      <ViewStateProvider>
                        <PathSelectionProvider>
                          {/*
                           * A comparison is a statement about the scenario it
                           * was built in, so moving to another one collapses it.
                           * Inside the provider it drives, under the editor
                           * whose navigation it watches.
                           */}
                          <ScenarioPathSelectionReset />
                          {/*
                           * The board reaches the address bar here, beside the
                           * reset, and for the same reason: it joins navigation,
                           * the path selection and the tab state, and none of
                           * those three providers may learn about the other two.
                           */}
                          <BoardAddressSync />
                          <TooltipProvider delay={200}>
                            <EditorErrorBoundary>
                              <EditorShell />
                            </EditorErrorBoundary>
                            {/*
                             * Outside the boundary, on purpose: a write can fail
                             * as the shell falls over, and the notice is what
                             * says so. Inside it, the one message explaining the
                             * blank screen would be caught by the blank screen.
                             */}
                            <WriteFailureNotices />
                          </TooltipProvider>
                        </PathSelectionProvider>
                      </ViewStateProvider>
                    </EditorProvider>
                  </TouchpointRegistryProvider>
                </EntityExamplesProvider>
              </ActiveServiceProvider>
            </SessionOverlay>
          </SupabaseProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </DeploymentConfigProvider>
  )
}

export default App
