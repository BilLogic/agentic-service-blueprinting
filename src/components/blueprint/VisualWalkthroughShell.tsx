import type { ReactNode } from 'react'
import { VisualWalkthroughModal } from '@/components/blueprint/VisualWalkthroughModal'
import { useEditor } from '@/contexts/EditorContext'
import { VisualWalkthroughProvider } from '@/contexts/VisualWalkthroughContext'

export function VisualWalkthroughShell({ children }: { children: ReactNode }) {
  const { activeSlideId } = useEditor()

  return (
    <VisualWalkthroughProvider resetKey={activeSlideId}>
      {children}
      <VisualWalkthroughModal />
    </VisualWalkthroughProvider>
  )
}
