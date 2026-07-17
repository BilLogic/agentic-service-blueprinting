import { EditorShell } from '@/components/editor/EditorShell'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EditorProvider } from '@/contexts/EditorContext'
import { SupabaseProvider } from '@/contexts/SupabaseProvider'

function App() {
  return (
    <SupabaseProvider>
      <EditorProvider>
        <TooltipProvider delay={200}>
          <EditorShell />
        </TooltipProvider>
      </EditorProvider>
    </SupabaseProvider>
  )
}

export default App
