import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'
import { EditorShell } from '@/components/editor/EditorShell'
import { ScenarioPathSelectionReset } from '@/components/editor/ScenarioPathSelectionReset'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EditorProvider } from '@/contexts/EditorContext'
import { PathSelectionProvider } from '@/contexts/PathSelectionContext'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
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
          <EditorProvider>
            <ViewStateProvider>
              <PathSelectionProvider>
                <ScenarioPathSelectionReset />
                <TooltipProvider delay={200}>
                  <EditorErrorBoundary>
                    <EditorShell />
                  </EditorErrorBoundary>
                </TooltipProvider>
              </PathSelectionProvider>
            </ViewStateProvider>
          </EditorProvider>
        </SupabaseProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
