import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'
import { EditorShell } from '@/components/editor/EditorShell'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import { EditorProvider } from '@/contexts/EditorContext'
import { EntityExamplesProvider } from '@/contexts/EntityExamplesContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import { ViewStateProvider } from '@/contexts/ViewStateContext'
import type { DeploymentConfig } from '@/deploymentConfig'
import { queryClient } from '@/lib/queryClient'

/**
 * The app root. Standalone it takes no props and runs on the template
 * defaults; mounted by an external deployment it takes a `DeploymentConfig`
 * that skins the tree from the outermost level down. Both the named export
 * (for a host) and the default export (for `main.tsx`) resolve to this.
 */
export function App({ config }: { config?: DeploymentConfig } = {}) {
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
            {/*
             * Above the editor so both the menubar identity headers and the
             * canvas read one cached service query; the definition popovers on
             * the board pick their per-kind example out of it by kind.
             */}
            <EntityExamplesProvider>
              <EditorProvider>
                <ViewStateProvider>
                  <PathSelectionProvider>
                    <TooltipProvider delay={200}>
                      <EditorErrorBoundary>
                        <EditorShell />
                      </EditorErrorBoundary>
                    </TooltipProvider>
                  </PathSelectionProvider>
                </ViewStateProvider>
              </EditorProvider>
            </EntityExamplesProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </DeploymentConfigProvider>
  )
}

export default App
