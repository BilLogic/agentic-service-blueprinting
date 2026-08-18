import { QueryClientProvider } from '@tanstack/react-query'
import { EditorShell } from '@/components/editor/EditorShell'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EditorProvider } from '@/contexts/EditorContext'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'
import { queryClient } from '@/lib/queryClient'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <EditorProvider>
          <TooltipProvider delay={200}>
            <EditorShell />
          </TooltipProvider>
        </EditorProvider>
      </SupabaseProvider>
    </QueryClientProvider>
  )
}

export default App
