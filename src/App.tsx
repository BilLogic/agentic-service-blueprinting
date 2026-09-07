import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'
import { EditorShell } from '@/components/editor/EditorShell'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EditorProvider } from '@/contexts/EditorContext'
import { EntityExamplesProvider } from '@/contexts/EntityExamplesContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import { TouchpointRegistryProvider } from '@/contexts/TouchpointRegistryProvider'
import { ViewStateProvider } from '@/contexts/ViewStateContext'
import { queryClient } from '@/lib/queryClient'

function App() {
  return (
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
            {/*
             * One unscoped read of `touchpoints.tone` and `.aliases` for the
             * whole session, published to the module store every touchpoint
             * face resolves its colour through (#326 S6).
             */}
            <TouchpointRegistryProvider>
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
            </TouchpointRegistryProvider>
          </EntityExamplesProvider>
        </SupabaseProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
